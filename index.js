const isFile = text => /[^\\/]+\.[^\\/]+$/.test(text);
const isOperator = text => /^(\|{1,2})|(<{1,2})|(&{1,2})|(>{1,2})|{|\[|\]|\}/.test(text);
const isQuoted = text => /^(".+")|('.+')$/.test(text);

exports.getTermProps = function (uid, parentProps, props) {
  return Object.assign(props, {uid});
};

exports.decorateTerm = function (Term, {React}) {
  return class extends React.Component {
    constructor(props, context) {
      super(props, context);

      this.onTerminal = this.onTerminal.bind(this);
      this.term = null;
    }

    onTerminal(term) {
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      this.term = term;
      const {screen_, onTerminalReady} = term;

      this.overrideScreen(screen_.constructor);

      term.onTerminalReady = function () {
        onTerminalReady.apply(this, arguments);
      };
    }

    overrideScreen(Screen) {
      if (Screen._links) {
        return;
      }
      Screen._links = true;

      const self = this;
      const {insertString, deleteChars} = Screen.prototype;

      Screen.prototype.insertString = function () {
        const result = insertString.apply(this, arguments);
        self.autolink(this);
        return result;
      };

      Screen.prototype.deleteChars = function () {
        const result = deleteChars.apply(this, arguments);
        self.autolink(this);
        return result;
      };
    }

    autolink(screen) {
      if (screen.cursorNode_.nodeName !== '#text' && !(screen.cursorNode_.nodeName === 'SPAN' && screen.cursorNode_.className === 'stylized-commands')) {
        return;
      }

      if (screen.cursorNode_.nodeName === '#text' || (screen.cursorNode_.nodeName === 'SPAN' && screen.cursorNode_.className === 'stylized-commands')) {
        const cursorNode = document.createElement('span');
        cursorNode.className = 'stylized-commands';

        const originalTextContent = screen.cursorNode_.textContent.split(' ');

        originalTextContent.forEach((text, index) => {
          const textNode = document.createElement('span');
          textNode.textContent = `${text} `;

          // If first word or first after a pipe, highlight as command
          if (index === 0 || isOperator(originalTextContent[index - 1])) {
            textNode.className = 'command';
          }

          if (text.startsWith('--') || text.startsWith('-')) {
            textNode.className = 'flag';
          }

          if (isOperator(text)) {
            textNode.className = 'operator';
          }

          if (isFile(text)) {
            textNode.className = 'file';
          }

          if (isQuoted(text)) {
            textNode.className = 'quoted';
          }

          return cursorNode.appendChild(textNode);
        });

        screen.cursorRowNode_.replaceChild(cursorNode, screen.cursorNode_);
        screen.cursorNode_ = cursorNode;
      }
    }

    render() {
      const styles = `
        x-screen span.stylized-commands {
          color: ${this.props.colors.red || '#ff2e88'};
        }
        x-screen span.command {
          color: ${this.props.foregroundColor || '#ff2e88'};
        }
        x-screen span.flag {
          color: ${this.props.colors.yellow || '#ffff00'};
        }
        x-screen span.operator {
          color: ${this.props.colors.white || '#ff00ff'};
        }
        x-screen span.file {
          color: ${this.props.colors.green || '#0000ff'};
        }
        x-screen span.quoted {
          color: ${this.props.colors.cyan || '#0000ff'};
        }
    `;

      const props = Object.assign({}, this.props, {
        onTerminal: this.onTerminal,
        customCSS: `${this.props.customCSS || ''} ${styles}`
      });

      return React.createElement(Term, props);
    }
  };
};
