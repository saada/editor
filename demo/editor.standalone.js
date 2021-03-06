(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.manshar = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Selection = require('./selection');
var Paragraph = require('./paragraph');
var Utils = require('./utils');


/**
 * Article main.
 * @param {Object} optParams Optional params to initialize the Article object.
 * Default:
 *   {
 *     sections: []
 *   }
 */
var Article = function(optParams) {
  // Override default params with passed ones if any.
  var params = Utils.extend({
    // The sections that is in this article.
    sections: []
  }, optParams);

  /**
   * Selection object.
   * @type {Selection}
   */
  this.selection = Selection.getInstance();

  /**
   * DOM element tied to this object.
   * @type {HTMLElement}
   */
  this.dom = document.createElement(Article.TAG_NAME);

  /**
   * The article sections.
   * @type {Array.<Section>}
   */
  this.sections = [];
  for (var i = 0; i < params.sections.length; i++) {
    this.insertSection(params.sections[i]);
  }

  /**
   * Operations history on the article.
   * @type {Array.<Object>}
   */
  this.history = [];

  /**
   * Currently at history point.
   * @type {number}
   */
  this.historyAt = 0;

};
module.exports = Article;

/**
 * Element Tag name when creating the associated DOM element.
 * @type {String}
 */
Article.TAG_NAME = 'article';


/**
 * Inserts a new section in article.
 * @param  {Section} section Section object.
 * @return {Section} The inserted section.
 */
Article.prototype.insertSection = function(section) {
  // Section should always have a paragraph when inserted into article.
  if (!section.paragraphs || !section.paragraphs.length) {
    section.insertParagraphAt(new Paragraph(), 0);
  }

  this.sections.push(section);
  this.dom.appendChild(section.dom);
  return section;
};


/**
 * Removes a section from article.
 * @param  {Section} section Section to remove.
 * @return {Section} Removed section.
 */
Article.prototype.removeSection = function(section) {
  var index = this.sections.indexOf(section);
  this.sections.splice(index, 1);
  return section;
};


// TODO: Implement.
Article.prototype.updateSection = function(section) {
  return section;
};


/**
 * Inserts a new paragraph in article.
 * @param  {Paragraph} paragraph Paragraph object.
 * @return {Paragraph} The inserted paragraph.
 */
Article.prototype.insertParagraph = function(paragraph) {
  var section = this.selection.getSectionAtEnd().
      insertParagraph(paragraph);
  return section;
};


/**
 * Removes a paragraph from article.
 * @param  {Paragraph} paragraph Paragraph to remove.
 * @return {Paragraph} Removed paragraph.
 */
Article.prototype.removeParagraph = function(paragraph) {
  var index = this.sections.indexOf(paragraph);
  this.paragraphs.splice(index, 1);
  return paragraph;
};


// TODO: Implement.
Article.prototype.updateParagraph = function(paragraph) {
  return paragraph;
};


/**
 * Creates and return a JSON representation of the model.
 * @return {Object} JSON representation of this section.
 */
Article.prototype.getJSONModel = function() {
  var article = {
    sections: []
  };

  for (var i = 0; i < this.sections.length; i++) {
    article.sections.push(this.sections[i].getJSONModel());
  }

  return article;
};


/**
 * Apply list of operations to the article model.
 * @param  {Array.<Object>} ops List of operations to apply.
 */
Article.prototype.transaction = function(ops) {
  if (this.historyAt < this.history.length) {
    this.history.splice(
        this.historyAt, this.history.length - this.historyAt);
  }
  this.history.push(ops);
  this.do();
};


/**
 * Executes the next available operation in the article history.
 */
Article.prototype.do = function() {
  var ops = this.history[this.historyAt++];

  for (var i = 0; i < ops.length; i++) {
    this.exec(ops[i], 'do');
  }
};


/**
 * Executes an operation in the history only if there were any.
 */
Article.prototype.redo = function() {
  if (this.historyAt < this.history.length) {
    this.do();
  }
};


/**
 * Executes the reverse (undo) part of an operation.
 */
Article.prototype.undo = function() {
  if (this.historyAt > 0) {
    var ops = this.history[--this.historyAt];

    for (var i = ops.length - 1; i >= 0; i--) {
      this.exec(ops[i], 'undo');
    }
  }
};


/**
 * Executes an operation with the passed action.
 * @param  {Object} operation An operation object to execute.
 * @param  {string} action Can be 'do' or 'undo'.
 */
Article.prototype.exec = function(operation, action) {
  var selection = this.selection;
  var op = operation[action].op;
  var paragraph, paragraphName, value, index, count;

  if (op === 'insertChars') {
    paragraphName = operation[action].paragraph;
    value = operation[action].value;
    index = operation[action].index;
    paragraph = this.getParagraphByName(paragraphName);
    paragraph.insertCharactersAt(value, index);

    if (operation[action].cursorOffset) {
      selection.setCursor({
        paragraph: paragraph,
        offset: operation[action].cursorOffset
      });
    }
  } else if (op === 'removeChars') {
    paragraphName = operation[action].paragraph;
    index = operation[action].index;
    count = operation[action].count;
    paragraph = this.getParagraphByName(paragraphName);
    paragraph.removeCharactersAt(index, count);

    if (operation[action].cursorOffset) {
      selection.setCursor({
        paragraph: paragraph,
        offset: operation[action].cursorOffset
      });
    }
  } else if (op === 'updateParagraph') {
    paragraphName = operation[action].paragraph;
    value = operation[action].value;
    paragraph = this.getParagraphByName(paragraphName);

    if (value !== undefined) {
      paragraph.setText(value);
    }

    // If this is to update inline formatting.
    if (operation[action].formats) {
      paragraph.applyFormats(operation[action].formats);
    }

    if (operation[action].cursorOffset !== undefined) {
      if (!operation[action].selectRange) {
        selection.setCursor({
          paragraph: paragraph,
          offset: operation[action].cursorOffset
        });
      } else {
        selection.select({
          paragraph: paragraph,
          offset: operation[action].cursorOffset
        }, {
          paragraph: paragraph,
          offset: operation[action].cursorOffset + operation[action].selectRange
        });
      }
    }

  } else if (op === 'deleteParagraph') {
    paragraph = this.getParagraphByName(operation[action].paragraph);
    paragraph.section.removeParagraph(paragraph);
  } else if (op === 'insertParagraph') {
    var section = this.getSectionByName(operation[action].section);
    var pType = operation[action].paragraphType || Paragraph.Types.Paragraph;
    section.insertParagraphAt(new Paragraph({
      name: operation[action].paragraph,
      paragraphType: pType
    }), operation[action].index);
  }
};


/**
 * Returns the section that has the specific name.
 * @param  {string} name Name of the section.
 * @return {Section} Section with the passed name.
 */
Article.prototype.getSectionByName = function(name) {
  for (var i = 0; i < this.sections.length; i++) {
    if (this.sections[i].name === name) {
      return this.sections[i];
    }
  }
};


/**
 * Returns the paragraph that has the specific name.
 * @param  {string} name Name of the paragraph.
 * @return {Paragraph} Paragraph with the passed name.
 */
Article.prototype.getParagraphByName = function(name) {
  for (var i = 0; i < this.sections.length; i++) {
    for (var j = 0; j < this.sections[i].paragraphs.length; j++) {
      if (this.sections[i].paragraphs[j].name === name) {
        return this.sections[i].paragraphs[j];
      }
    }
  }
};

},{"./paragraph":6,"./selection":8,"./utils":9}],2:[function(require,module,exports){
'use strict';

var Article = require('./article');
var Paragraph = require('./paragraph');
var Section = require('./section');
var Utils = require('./utils');
var FormattingExtension = require('./extensions/formatting');
var ShortcutsManager = require('./extensions/shortcutsManager');

/**
 * Editor main.
 * @param {HTMLElement} element Editor element to decorate.
 * @param {Object} optParams Optional params to initialize the editor.
 * Default:
 *   {
 *     extensions: [new FormattingExtension()]
 *   }
 */
var Editor = function(element, optParams) {

  // Override default params with passed ones if any.
  var params = Utils.extend({
    // The extensions enabled in this editor.
    extensions: [
        // TODO(mkhatib): Handle different kind of shortcuts (e.g. formatting)
        new FormattingExtension(this),
    ]
  }, optParams);

  /**
   * Unique name to identify the editor.
   * @type {string}
   */
  this.name = Utils.getUID();

  /**
   * Extensions enabled in the editor.
   * @type {Array.<Object>}
   */
  this.extensions = params.extensions;

  /**
   * Element to decorate the editor on.
   * @type {HTMLElement}
   */
  this.element = element;

  /**
   * Main article model.
   * @type {Article}
   */
  this.article = null;

  /**
   * Shortcuts manager to handle keyboard shortcuts on the editor.
   * @type {ShortcutsManager}
   */
  this.shortcutsManager = new ShortcutsManager(this);

  this.init();
};
Editor.prototype = new Utils.CustomEventTarget();
module.exports = Editor;


/**
 * Initialize the editor article model and event listeners.
 */
Editor.prototype.init = function() {
  // This is just to render and test the initial dom creation.
  // This will probably change dramatically as we go forward.
  // TODO(mkhatib): Drop these.

  var section = new Section({
    paragraphs: [
      new Paragraph({
        placeholderText: 'Manshar Editor Demo',
        paragraphType: Paragraph.Types.MainHeader
      }),
      new Paragraph({
        placeholderText: 'This is just a demo.',
        paragraphType: Paragraph.Types.ThirdHeader
      }),
      new Paragraph({
        placeholderText: 'Play around and see the internal model of the' +
          ' article being displayed to the right. The Editor is still under'+
          ' development.'
      })
    ]
  });

  this.article = new Article({
    sections: [section]
  });
  this.article.selection.initSelectionListener(this.element);

  if (this.extensions) {
    for (var i = 0; i < this.extensions.length; i++) {
      var extension = this.extensions[i];
      if (typeof extension.init === 'function') {
        extension.init(this);
      }
    }
  }
  this.element.addEventListener('keydown', this.handleKeyDownEvent.bind(this));
  this.element.addEventListener('cut', this.handleCut.bind(this));
  this.element.addEventListener('paste', this.handlePaste.bind(this));
  this.element.className += ' manshar-editor';
  this.element.setAttribute('contenteditable', true);
  this.element.appendChild(this.article.dom);

  this.article.selection.setCursor({
    paragraph: section.paragraphs[0],
    offset: 0
  });
};


/**
 * Handels `keydown` events.
 * @param  {Event} event Event object.
 */
Editor.prototype.handleKeyDownEvent = function(event) {
  var selection = this.article.selection;
  var preventDefault = false;
  var ops = [];
  var inBetweenParagraphs = [];

  if (Utils.isUndo(event)) {
    this.article.undo();
    preventDefault = true;
  } else if (Utils.isRedo(event)) {
    this.article.redo();
    preventDefault = true;
  }

  // If selected text and key pressed will produce a change. Remove selected.
  // i.e. Enter, characters, space, backspace...etc
  else if (selection.isRange() && Utils.willTypeCharacter(event)) {
    var section = selection.getSectionAtStart();
    inBetweenParagraphs = section.getParagraphsBetween(
        selection.start.paragraph, selection.end.paragraph);
    ops.push.apply(ops, this.getDeleteSelectionOps());

    this.article.transaction(ops);
    ops = [];

    // Only stop propagation on special characters (Enter, Delete, Backspace)
    // We already handled or will handle them in the switch statement.
    // For all others (e.g. typing a char key) don't stop propagation and
    // allow the contenteditable to handle it.
    var stopPropagationCodes = [13, 8, 46];
    preventDefault = stopPropagationCodes.indexOf(event.keyCode) !== -1;
  }

  var offsetAfterOperation;
  var currentParagraph = selection.getParagraphAtEnd();
  var currentIndex = currentParagraph.section.paragraphs.indexOf(
      currentParagraph);
  var nextParagraph = currentParagraph.getNextParagraph();
  var prevParagraph = currentParagraph.getPreviousParagraph();

  switch (event.keyCode) {
    // Enter.
    case 13:
      var uid = Utils.getUID();
      if (!selection.isCursorAtEnding()) {
        ops.push.apply(ops, this.getSplitParagraphOps(
            -inBetweenParagraphs.length));

      } else if (nextParagraph && nextParagraph.isPlaceholder()) {
        // If the next paragraph is a placeholder, just move the cursor to it
        // and don't insert a new paragraph.
        selection.setCursor({
          paragraph: nextParagraph,
          offset: 0
        });
      } else {
        ops.push({
          do: {
            op: 'insertParagraph',
            section: selection.end.paragraph.section.name,
            cursorOffset: 0,
            paragraph: uid,
            index: currentIndex - inBetweenParagraphs.length + 1
          },
          undo: {
            op: 'deleteParagraph',
            paragraph: uid
          }
        });
      }
      this.article.transaction(ops);
      preventDefault = true;
      break;

    // Backspace.
    case 8:
      // If the cursor at the beginning of paragraph. Merge Paragraphs.
      if (selection.isCursorAtBeginning() && prevParagraph) {
        offsetAfterOperation = prevParagraph.text.length;

        ops.push.apply(ops, this.getMergeParagraphsOps(
            prevParagraph, currentParagraph, -inBetweenParagraphs.length));
        this.article.transaction(ops);

        selection.setCursor({
          paragraph: prevParagraph,
          offset: offsetAfterOperation
        });
        preventDefault = true;
      }
      break;

    // Delete.
    case 46:
      // If cursor at the end of the paragraph. Merge Paragraphs.
      if (selection.isCursorAtEnding() && nextParagraph) {
        offsetAfterOperation = currentParagraph.text.length;

        ops.push.apply(ops, this.getMergeParagraphsOps(
            currentParagraph, nextParagraph, -inBetweenParagraphs.length));

        this.article.transaction(ops);

        selection.setCursor({
          paragraph: currentParagraph,
          offset: offsetAfterOperation
        });
        preventDefault = true;
      }
      break;
    default:
      break;
  }

  if (preventDefault) {
    event.preventDefault();
    event.stopPropagation();
  } else if (currentParagraph && Utils.willTypeCharacter(event)) {
    // Update current paragraph internal text model.
    var oldValue = currentParagraph.text;
    var article = this.article;
    var isRemoveOp = [46, 8].indexOf(event.keyCode) !== -1;
    var cursorOffsetDirection = 1;
    if (event.keyCode === 8) {
      cursorOffsetDirection = -1;
    } else if (event.keyCode === 46) {
      cursorOffsetDirection = 0;
    }

    setTimeout(function() {
      var newValue = currentParagraph.dom.innerText;
      var newOffset = selection.end.offset + cursorOffsetDirection;

      if (!isRemoveOp) {
        var insertedChar = newValue.charAt(Math.min(newOffset, newValue.length) - 1);
        ops.push({
          do: {
            op: 'insertChars',
            paragraph: currentParagraph.name,
            cursorOffset: newOffset,
            value: insertedChar,
            index: selection.end.offset
          },
          undo: {
            op: 'removeChars',
            paragraph: currentParagraph.name,
            cursorOffset: selection.end.offset,
            index: selection.end.offset,
            count: 1
          }
        });
      } else if (oldValue) {
        var deletedChar = oldValue.charAt(newOffset);
        ops.push({
          do: {
            op: 'removeChars',
            paragraph: currentParagraph.name,
            cursorOffset: newOffset,
            index: newOffset,
            count: 1
          },
          undo: {
            op: 'insertChars',
            paragraph: currentParagraph.name,
            cursorOffset: selection.end.offset,
            value: deletedChar,
            index: newOffset
          }
        });
      }

      article.transaction(ops);
    }, 3);
  }

  // Dispatch a `change` event
  var dispatchEvent = this.dispatchEvent.bind(this);
  setTimeout(function() {
    dispatchEvent(new Event('change'));
  }, 10);
};


/**
 * Generates the operations needed to delete current selection.
 * @return {Array.<Object>} List of operations to delete selection.
 */
Editor.prototype.getDeleteSelectionOps = function() {
  var ops = [];
  var count;
  var selection = this.article.selection;
  var section = selection.getSectionAtStart();
  var inBetweenParagraphs = section.getParagraphsBetween(
      selection.start.paragraph, selection.end.paragraph);

  for (var i = 0; i < inBetweenParagraphs.length; i++) {
    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: inBetweenParagraphs[i].name,
        cursorOffset: 0,
        value: '',
      },
      undo: {
        op: 'updateParagraph',
        paragraph: inBetweenParagraphs[i].name,
        cursorOffset: inBetweenParagraphs[i].text.length,
        value: inBetweenParagraphs[i].text,
        formats: inBetweenParagraphs[i].formats
      }
    });
    var paragraphIndex = section.paragraphs.indexOf(inBetweenParagraphs[i]);
    ops.push({
      do: {
        op: 'deleteParagraph',
        paragraph: inBetweenParagraphs[i].name
      },
      undo: {
        op: 'insertParagraph',
        section: inBetweenParagraphs[i].section.name,
        paragraph: inBetweenParagraphs[i].name,
        index: paragraphIndex - i
      }
    });
  }

  if (selection.end.paragraph !== selection.start.paragraph) {
    var lastParagraphOldText = selection.end.paragraph.text;
    var lastParagraphText = lastParagraphOldText.substring(
        selection.end.offset, lastParagraphOldText.length);
    var lastParagraphIndex = section.paragraphs.indexOf(
        selection.end.paragraph);

    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: selection.end.paragraph.name,
        cursorOffset: 0,
        value: '',
      },
      undo: {
        op: 'updateParagraph',
        paragraph: selection.end.paragraph.name,
        cursorOffset: selection.end.offset,
        value: lastParagraphOldText,
        formats: selection.end.paragraph.formats
      }
    });
    ops.push({
      do: {
        op: 'deleteParagraph',
        paragraph: selection.end.paragraph.name
      },
      undo: {
        op: 'insertParagraph',
        section: selection.end.paragraph.section.name,
        paragraph: selection.end.paragraph.name,
        index: lastParagraphIndex - inBetweenParagraphs.length
      }
    });

    var firstParagraphOldText = selection.start.paragraph.text;
    var firstParagraphText = firstParagraphOldText.substring(
        selection.start.offset, firstParagraphOldText.length);

    var startParagraph = selection.start.paragraph;
    var startParagraphFormats = startParagraph.getFormatsForRange(
        selection.start.offset, firstParagraphOldText.length);

    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: startParagraph.name,
        cursorOffset: selection.start.offset,
        selectRange: firstParagraphOldText.length - selection.start.offset,
        formats: startParagraphFormats
      },
      undo: {
        op: 'updateParagraph',
        paragraph: startParagraph.name,
        cursorOffset: selection.start.offset,
        selectRange: firstParagraphOldText.length - selection.start.offset,
        formats: startParagraphFormats
      }
    });
    ops.push({
      do: {
        op: 'removeChars',
        paragraph: startParagraph.name,
        cursorOffset: selection.start.offset,
        index: selection.start.offset,
        count: firstParagraphText.length
      },
      undo: {
        op: 'insertChars',
        paragraph: selection.start.paragraph.name,
        cursorOffset: selection.start.offset,
        selectRange: firstParagraphText.length,
        index: selection.start.offset,
        value: firstParagraphText
      }
    });

    var lastCount = lastParagraphOldText.length - lastParagraphText.length;
    ops.push({
      do: {
        op: 'insertChars',
        paragraph: startParagraph.name,
        cursorOffset: selection.start.offset,
        index: selection.start.offset,
        value: lastParagraphText
      },
      undo: {
        op: 'removeChars',
        paragraph: startParagraph.name,
        cursorOffset: selection.start.offset,
        index: selection.start.offset,
        count: lastCount
      }
    });

    var endParagraphFormatting = selection.end.paragraph.getFormatsForRange(
        selection.end.offset, lastParagraphOldText.length);
    var formatShift = -lastCount + selection.start.offset;
    for (var k = 0; k < endParagraphFormatting.length; k++) {
      endParagraphFormatting[k].from += formatShift;
      endParagraphFormatting[k].to += formatShift;
    }

    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: startParagraph.name,
        cursorOffset: firstParagraphOldText.length - firstParagraphText.length,
        formats: endParagraphFormatting
      },
      undo: {
        op: 'updateParagraph',
        paragraph: startParagraph.name,
        cursorOffset: firstParagraphOldText.length - firstParagraphText.length,
        formats: endParagraphFormatting
      }
    });


  } else {
    var currentParagraph = selection.start.paragraph;
    var selectedText = currentParagraph.text.substring(
        selection.start.offset, selection.end.offset);
    count = selection.end.offset - selection.start.offset;
    var currentParagraphFormats = currentParagraph.getFormatsForRange(
        selection.start.offset, selection.end.offset);
    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: currentParagraph.name,
        cursorOffset: selection.start.offset,
        selectRange: count,
        formats: currentParagraphFormats
      },
      undo: {
        op: 'updateParagraph',
        paragraph: currentParagraph.name,
        cursorOffset: selection.start.offset,
        selectRange: count,
        formats: currentParagraphFormats
      }
    });
    ops.push({
      do: {
        op: 'removeChars',
        paragraph: currentParagraph.name,
        cursorOffset: selection.start.offset,
        index: selection.start.offset,
        count: count
      },
      undo: {
        op: 'insertChars',
        paragraph: currentParagraph.name,
        cursorOffset: selection.start.offset,
        selectRange: count,
        index: selection.start.offset,
        value: selectedText
      }
    });
  }

  return ops;
};


/**
 * Generates the operations needed to split a paragraph into two at the cursor.
 * @param  {number} indexOffset Offset to add to paragraphs index.
 * @return {Array.<Object>} List of operations to split the paragraph.
 */
Editor.prototype.getSplitParagraphOps = function(indexOffset) {
  var ops = [];
  var selection = this.article.selection;
  var currentParagraph = selection.getParagraphAtEnd();
  var currentIndex = currentParagraph.section.paragraphs.indexOf(
      currentParagraph);
  var afterCursorText = currentParagraph.text.substring(
      selection.end.offset, currentParagraph.text.length);
  var uid = Utils.getUID();
  ops.push({
    do: {
      op: 'insertParagraph',
      section: selection.end.paragraph.section.name,
      paragraph: uid,
      index: currentIndex + 1 + indexOffset
    },
    undo: {
      op: 'deleteParagraph',
      paragraph: uid
    }
  });

  var afterCursorFormats = currentParagraph.getFormatsForRange(
      selection.start.offset, currentParagraph.text.length);

  ops.push({
    do: {
      op: 'updateParagraph',
      paragraph: currentParagraph.name,
      cursorOffset: selection.start.offset,
      formats: afterCursorFormats
    },
    undo: {
      op: 'updateParagraph',
      paragraph: currentParagraph.name,
      cursorOffset: selection.start.offset,
      formats: afterCursorFormats
    }
  });

  ops.push({
    do: {
      op: 'removeChars',
      paragraph: currentParagraph.name,
      cursorOffset: selection.start.offset,
      index: selection.start.offset,
      count: afterCursorText.length
    },
    undo: {
      op: 'insertChars',
      paragraph: currentParagraph.name,
      cursorOffset: selection.end.offset,
      value: afterCursorText,
      index: selection.start.offset
    }
  });

  var afterCursorShiftedFormats = Utils.clone(afterCursorFormats);
  var formatShift = -selection.start.offset;
  for (var k = 0; k < afterCursorShiftedFormats.length; k++) {
    afterCursorShiftedFormats[k].from += formatShift;
    afterCursorShiftedFormats[k].to += formatShift;
  }
  ops.push({
    do: {
      op: 'updateParagraph',
      paragraph: uid,
      cursorOffset: 0,
      value: afterCursorText,
      formats: afterCursorShiftedFormats
    },
    undo: {
      op: 'updateParagraph',
      paragraph: uid,
      cursorOffset: 0,
    }
  });

  return ops;
};


/**
 * Generates the operations needed to merge two paragraphs.
 * TODO(mkhatib): Figure out a way to handle this without discarding the formats
 * of the text in the paragraphs.
 * @param  {Paragraph} firstP First Paragraph.
 * @param  {Paragraph} secondP Second Paragraph.
 * @param  {number} indexOffset Offset to add to paragraphs index.
 * @return {Array.<Object>} List of operations to merge the paragraphs.
 */
Editor.prototype.getMergeParagraphsOps = function(
    firstP, secondP, indexOffset) {
  var ops = [];
  var secondPIndex = secondP.section.paragraphs.indexOf(secondP);
  var offsetAfterOperation = firstP.text.length;

  ops.push({
    do: {
      op: 'updateParagraph',
      paragraph: secondP.name,
      cursorOffset: 0,
      value: '',
    },
    undo: {
      op: 'updateParagraph',
      paragraph: secondP.name,
      cursorOffset: 0,
      value: secondP.text,
      formats: secondP.formats
    }
  });

  ops.push({
    do: {
      op: 'deleteParagraph',
      paragraph: secondP.name
    },
    undo: {
      op: 'insertParagraph',
      section: secondP.section.name,
      paragraph: secondP.name,
      index: secondPIndex + indexOffset
    }
  });

  ops.push({
    do: {
      op: 'insertChars',
      paragraph: firstP.name,
      cursorOffset: offsetAfterOperation,
      value: secondP.text,
      index: offsetAfterOperation
    },
    undo: {
      op: 'removeChars',
      paragraph: firstP.name,
      cursorOffset: offsetAfterOperation,
      index: offsetAfterOperation,
      count: secondP.text.length
    }
  });

  var secondPFormatting = Utils.clone(secondP.formats);
  var formatShift = firstP.text.length;
  for (var k = 0; k < secondPFormatting.length; k++) {
    secondPFormatting[k].from += formatShift;
    secondPFormatting[k].to += formatShift;
  }

  ops.push({
    do: {
      op: 'updateParagraph',
      paragraph: firstP.name,
      cursorOffset: offsetAfterOperation,
      formats: secondPFormatting
    },
    undo: {
      op: 'updateParagraph',
      paragraph: firstP.name,
      cursorOffset: offsetAfterOperation,
      formats: secondPFormatting
    }
  });

  return ops;
};


/**
 * Handles paste event for the editor.
 * @param  {Event} event Paste Event.
 */
Editor.prototype.handlePaste = function(event) {
  var pastedContent;
  if (window.clipboardData && window.clipboardData.getData) { // IE
    pastedContent = window.clipboardData.getData('Text');
  } else if (event.clipboardData && event.clipboardData.getData) {
    pastedContent = event.clipboardData.getData('text/html');
  }

  var tempEl = document.createElement('div');
  tempEl.innerHTML = pastedContent;

  var ops = this.processPastedContent(tempEl);
  this.article.transaction(ops);

  event.preventDefault();
};


/**
 * Creates and return a JSON representation of the model.
 * @return {Object} JSON representation of this paragraph.
 */
Editor.prototype.getJSONModel = function() {
  return this.article.getJSONModel();
};


/**
 * Sanitizes and generates list of operations to properly insert pasted
 * content into the article.
 *
 * TODO(mkhatib): Probably move this to its own module and
 * make it easier for people to customize or override this with
 * their own sanitizer.
 *
 * @param  {HTMLElement} element HTML Element to sanitize and create ops for.
 * @return {Array.<Object>} List of operations objects that represents the
 * the pasted content.
 */
Editor.prototype.processPastedContent = function(element, indexOffset) {
  var ops = [];
  var text, uid, paragraphType, appendOperations;
  var textPasted = element.innerText;
  var children = element.childNodes;

  var selection = this.article.selection;
  var currentParagraph = selection.start.paragraph;
  var section = selection.getSectionAtStart();
  var startParagraphIndex = section.paragraphs.indexOf(currentParagraph);
  var currentIndex = indexOffset || startParagraphIndex;
  var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

  var INLINE_ELEMENTS = 'B BR BIG I SMALL ABBR ACRONYM CITE EM STRONG A BDO'+
      ' SPAN SUB SUP #text'.split(' ');

  function hasOnlyInlineChildNodes(elem) {
    var children = elem.childNodes;
    for (var i = 0; i < children.length ; i++) {
      if (INLINE_ELEMENTS.indexOf(children[i].nodeName) === -1) {
        return false;
      }
    }
    return true;
  }

  function getTextProp(el) {
    var textProp;

    if (el.nodeType === Node.TEXT_NODE) {
      textProp = "data";
    } else if (isFirefox) {
      textProp = "textContent";
    } else {
      textProp = "innerText";
    }

    return textProp;
  }

  function isInlinePaste(children) {
    var metaNodes = 0;
    for (var i = 0; i < children.length; i++) {
      if (children[i] && children[i].nodeName.toLowerCase() === 'meta') {
        metaNodes++;
      }
    }

    if (children.length - metaNodes < 2) {
      return true;
    }
  }

  if (!children || !children.length || isInlinePaste(children)) {

    // Text before and after pasting.
    var textStart = currentParagraph.text.substring(0, selection.start.offset);

    // Calculate cursor offset before and after pasting.
    var offsetAfterOperation = (textStart + textPasted).length;
    var offsetBeforeOperation = textStart.length;

    ops.push({
      do: {
        op: 'insertChars',
        paragraph: currentParagraph.name,
        cursorOffset: offsetAfterOperation,
        value: textPasted,
        index: offsetBeforeOperation
      },
      undo: {
        op: 'removeChars',
        paragraph: currentParagraph.name,
        cursorOffset: offsetBeforeOperation,
        index: offsetBeforeOperation,
        count: textPasted.length
      }
    });
  } else {
    // When pasting multi-line split the current paragraph if pasting
    // mid-paragraph.
    if (!selection.isCursorAtEnding()) {
      ops.push.apply(ops, this.getSplitParagraphOps(
          currentIndex));
    }
    currentIndex++;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.nodeName && el.nodeName.toLowerCase();
      switch (tag) {
        // These tags are currently unsupported for paste and are stripped out.
        case undefined:
        case 'meta':
        case 'script':
        case 'style':
        case 'embed':
        case 'br':
        case 'hr':
        case 'img':
        case 'figure':
          continue;
        // All the following will just insert a normal paragraph for now.
        // TODO(mkhatib): When the editor supports more paragraph types
        // fix this to allow pasting lists and other types.
        case 'ul':
        case 'ol':
        case 'p':
        case '#text':
          paragraphType = Paragraph.Types.Paragraph;
          break;
        case 'blockquote':
          paragraphType = Paragraph.Types.Quote;
          break;
        case 'h1':
          paragraphType = Paragraph.Types.MainHeader;
          break;
        case 'h2':
          paragraphType = Paragraph.Types.SecondaryHeader;
          break;
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          paragraphType = Paragraph.Types.ThirdHeader;
          break;
        case 'pre':
          paragraphType = Paragraph.Types.Code;
          break;


        default:
          // To preserve inline styling.
          if (hasOnlyInlineChildNodes(children[i])) {
            // TODO(mkhatib): This is here to preserve inline styling, which
            // is currently unsupported by the editor. Once this is added
            // change this to reflect that. Currently just add a non-styled
            // paragraph.
            paragraphType = Paragraph.Types.Paragraph;
          } else {
            // In case there are still more block elements, recursively get
            // their operations and add them to the operations list.

            // TODO(mkhatib): This is very clumsy and not very readable, move
            // the recursive process to its own helper method and make it more
            // readable.
            appendOperations = this.processPastedContent(
                children[i], currentIndex);

            // Increase the currentIndex by the amount of paragraphs we've added
            // which is the amount of operations over 2 (2 operations per
            // paragraph, one insert one update.).
            currentIndex += appendOperations.length/2;
          }
      }

      if (appendOperations) {
        Array.prototype.push.apply(ops, appendOperations);
      } else {
        // Add an operation to insert new paragraph and update its text.
        uid = Utils.getUID();
        text = el[getTextProp(el)];
        ops.push({
          do: {
            op: 'insertParagraph',
            section: section.name,
            paragraph: uid,
            index: currentIndex++,
            paragraphType: paragraphType
          },
          undo: {
            op: 'deleteParagraph',
            paragraph: uid,
          }
        });
        ops.push({
          do: {
            op: 'updateParagraph',
            paragraph: uid,
            cursorOffset: text.length,
            value: text
          },
          undo: {
            op: 'updateParagraph',
            paragraph: uid,
            cursorOffset: 0,
            value: ''
          }
        });
      }
    }
  }
  return ops;
};


/**
 * Handles cut event for the editor.
 */
Editor.prototype.handleCut = function() {
  var ops = this.getDeleteSelectionOps();
  var article = this.article;
  var dispatchEvent = this.dispatchEvent.bind(this);
  setTimeout(function() {
    article.transaction(ops);
    dispatchEvent(new Event('change'));
  }, 20);
};


},{"./article":1,"./extensions/formatting":3,"./extensions/shortcutsManager":4,"./paragraph":6,"./section":7,"./utils":9}],3:[function(require,module,exports){
'use strict';

var Paragraph = require('../paragraph');
var Selection = require('../selection');
var Utils = require('../utils');


// TODO: Refactor this to make toolbar its own module and separate
// the logic of formatting from the UI components.
// Also encompass toolbar into an object with a .dom property on it
// to access its HTMLElement.

/**
 * Editor formatting logic is an extension to the editor.
 * @param {Object} optParams Optional params to initialize the Formatting object.
 * Default:
 *   {
 *     enableInline: true,
 *     enableBlock: true
 *   }
 */
var Formatting = function(optParams) {

  // Override default params with passed ones if any.
  var params = Utils.extend({
    // TODO: Use these configurations to disable/enable toolbars.
    enableInline: true,
    enableBlock: true
  }, optParams);

  /**
   * Whether inline formatting toolbar is enabled.
   * @type {boolean}
   */
  this.enableInline = params.enableInline;

  /**
   * Whether inline formatting toolbar is enabled.
   * @type {boolean}
   */
  this.enableBlock = params.enableBlock;

  /**
   * Editor reference.
   * @type {Editor}
   */
  this.editor = null;

};
module.exports = Formatting;


/**
 * Active button class name.
 * @type {string}
 */
Formatting.ACTIVE_ACTION_CLASS = 'active';


/**
 * Types of formatting.
 * @enum {string}
 */
Formatting.Types = {
  BLOCK: 'block',
  INLINE: 'inline'
};


/**
 * Used to position the toolbars outside the user view.
 * @type {number}
 */
Formatting.EDGE = -999999;


/**
 * Actions allowed on the toolbars.
 * @type {Object}
 */
Formatting.Actions = {

  // Block formatting.
  // TODO: Implement Ordered and Unordered lists.
  Block: [{
    label: 'h1',
    value: Paragraph.Types.MainHeader,
    shortcuts: ['alt+cmd+1', 'alt+ctrl+1']
  }, {
    label: 'h2',
    value: Paragraph.Types.SecondaryHeader,
    shortcuts: ['alt+cmd+2', 'alt+ctrl+2']
  }, {
    label: 'h3',
    value: Paragraph.Types.ThirdHeader,
    shortcuts: ['alt+cmd+3', 'alt+ctrl+3']
  }, {
    label: '”',
    value: Paragraph.Types.Quote,
    shortcuts: ['alt+cmd+4', 'alt+ctrl+4']
  }, {
    label: '{}',
    value: Paragraph.Types.Code,
    shortcuts: ['alt+cmd+5', 'alt+ctrl+5']
  }],

  Inline: [{
    label: 'B',
    value: 'strong',
    shortcuts: ['ctrl+b', 'cmd+b']
  }, {
    label: 'I',
    value: 'em',
    shortcuts: ['ctrl+i', 'cmd+i']
  }, {
    label: 'U',
    value: 'u',
    shortcuts: ['ctrl+u', 'cmd+u']
  }, {
    label: 'S',
    value: 's',
    shortcuts: ['ctrl+s', 'cmd+s']
  }, {
    label: 'a',
    value: 'a',
    attrs: {
      href: {
        required: true,
        placeholder: 'What is the URL?'
      }
    },
    shortcuts: ['ctrl+k', 'cmd+k']
  }]
};


/**
 * Initializes the formatting extension.
 * @param  {Editor} editor The parent editor for the extension.
 */
Formatting.prototype.init = function(editor) {
  this.editor = editor;

  // Inline toolbar used for formatting inline elements (bold, italic...).
  this.inlineToolbar = this.createInlineToolbar();
  document.body.appendChild(this.inlineToolbar);

  // Block toolbar used for formatting block elements (h1, h2, pre...).
  this.blockToolbar = this.createBlockToolbar();
  document.body.appendChild(this.blockToolbar);

  // Initializes event listener to update toolbars position and status
  // when selection or cursor change.
  this.editor.article.selection.addEventListener(
      Selection.Events.SELECTION_CHANGED,
      this.handleSelectionChangedEvent.bind(this));
};


/**
 * Creates inline formatting toolbar.
 * @return {HTMLElement} Toolbar Element.
 */
Formatting.prototype.createInlineToolbar = function() {
  var toolbar = document.createElement('div');
  toolbar.id = 'editor-inline-toolbar-' + this.editor.name;
  toolbar.className = 'editor-toolbar editor-inline-toolbar';

  toolbar.appendChild(this.createToolbarButtons(
      Formatting.Actions.Inline, Formatting.Types.INLINE));
  return toolbar;
};


/**
 * Creates block formatting toolbar.
 * @return {HTMLElement} Toolbar Element.
 */
Formatting.prototype.createBlockToolbar = function() {
  var toolbar = document.createElement('div');
  toolbar.id = 'editor-block-toolbar-' + this.editor.name;
  toolbar.className = 'editor-toolbar editor-block-toolbar';

  toolbar.appendChild(this.createToolbarButtons(
      Formatting.Actions.Block, Formatting.Types.BLOCK));
  return toolbar;
};


/**
 * Creates toolbar buttons from passed actions.
 * @param  {Array.<Object>} actions Actions to create buttons for.
 * @param  {string} type Can be 'block' or 'inline'.
 * @return {HTMLElement} Element that holds the list of created buttons.
 */
Formatting.prototype.createToolbarButtons = function(actions, type) {
  var i;
  var container = document.createElement('div');
  var buttonsList = document.createElement('ul');
  var extraFieldsContainer = document.createElement('div');
  buttonsList.className = 'editor-toolbar-buttons';
  container.className = 'buttons-fields-container';
  extraFieldsContainer.className = 'extra-fields-container';
  for (i = 0; i < actions.length; i++) {
    var fields = this.createExtraFields(actions[i], type);
    if (fields) {
      extraFieldsContainer.appendChild(fields);
    }
  }
  container.appendChild(extraFieldsContainer);

  for (i = 0; i < actions.length; i++) {
    buttonsList.appendChild(this.createButton(actions[i], type));
  }
  container.appendChild(buttonsList);

  return container;
};


/**
 * Creates a single action button.
 * @param  {Object} action Action to create the button for.
 * @param  {string} type Can be 'block' or 'inline'.
 * @return {HTMLElement} Button element.
 */
Formatting.prototype.createButton = function(action, type) {
  var button = document.createElement('button');
  button.innerHTML = action.label;
  button.value = action.value;
  button.type = type;

  // Add Event Listener to take action when clicking the button.
  button.addEventListener('click', this.handleButtonClicked.bind(this));
  for (var i = 0; i < action.shortcuts.length; i++) {
    this.editor.shortcutsManager.register(
        action.shortcuts[i], this.handleKeyboardShortcut.bind(this));
  }
  return button;
};


/**
 * Creates extra fields for the action.
 * @param  {Object} action Action to create the button for.
 * @return {HTMLElement} div contianer containing extra fields.
 */
Formatting.prototype.createExtraFields = function(action) {
  if (!action.attrs) {
    return;
  }

  var fields = document.createElement('div');
  fields.className = 'extra-fields ' + action.label;

  for (var key in action.attrs) {
    var attr = action.attrs[key];
    var field = document.createElement('input');
    field.placeholder = attr.placeholder;
    field.setAttribute('name', key);
    if (attr.required) {
      field.setAttribute('required', attr.required);
    }
    fields.appendChild(field);

    // Handle pressing enter.
    field.addEventListener(
        'keyup', this.handleInlineInputFieldKeyUp.bind(this));

    // TODO(mkhatib): Maybe in future also apply format attributes on blur.
    // field.addEventListener(
    //     'blur', this.handleInlineInputFieldBlur.bind(this));
  }

  return fields;
};


/**
 * Focuses on the field for attributes for the active action.
 * @param  {HTMLElement} toolbar The toolbar element to focus the fields for.
 * @param  {Object} action The action representing the object to focus.
 */
Formatting.prototype.focusOnExtraFieldsFor = function(toolbar, action) {
  this.setToolbarActiveAction(toolbar, action);
  var activeFields = toolbar.querySelector(
      '.extra-fields.' + Formatting.ACTIVE_ACTION_CLASS);
  var firstInput = activeFields.querySelector('input');
  firstInput.focus();
};


/**
 * Applies a format with attributes from the active button and fields.
 */
Formatting.prototype.applyFormatWithAttrs = function() {
  var activeButton = this.inlineToolbar.querySelector(
      'button.' + Formatting.ACTIVE_ACTION_CLASS);
  var activeFormatter = activeButton.value;
  var activeFields = this.inlineToolbar.querySelector(
      '.extra-fields.' + Formatting.ACTIVE_ACTION_CLASS);

  var attrs = {};
  var inputs = activeFields.querySelectorAll('input');
  for (var i = 0; i < inputs.length; i++) {
    attrs[inputs[i].name] = inputs[i].value;
  }
  this.handleInlineFormatting(activeFormatter, attrs);
};


/**
 * Handles clicking enter in the attributes fields to apply the format.
 * @param  {Event} event Keyboard event.
 */
Formatting.prototype.handleInlineInputFieldKeyUp = function(event) {
  // Enter.
  if (event.keyCode === 13) {
    this.applyFormatWithAttrs();
  }
};


/**
 * Handles clicking a formatting bar action button.
 * @param  {Event} event Click event.
 */
Formatting.prototype.handleButtonClicked = function(event) {
  if (event.target.getAttribute('type') == Formatting.Types.BLOCK) {
    this.handleBlockFormatterClicked(event);
  } else {
    this.handleInlineFormatterClicked(event);
  }
};


/**
 * Handles changing in selection or cursor.
 */
Formatting.prototype.handleSelectionChangedEvent = function() {
  var wSelection = window.getSelection();

  if (wSelection.isCollapsed) {
    // If there's no selection, show the block toolbar.
    this.repositionBlockToolbar();
  } else {
    // Otherwise, show the inline toolbar.
    this.repositionInlineToolbar();
    setTimeout(this.reloadInlineToolbarStatus.bind(this), 10);
  }
};


/**
 * Reposition inline formatting toolbar and hides block toolbar.
 */
Formatting.prototype.repositionInlineToolbar = function() {
  var wSelection = window.getSelection();
  var range = wSelection.getRangeAt(0);
  var bounds = range.getBoundingClientRect();

  // Hide the block formatting toolbar.
  this.setToolbarPosition(
      this.blockToolbar, Formatting.EDGE, Formatting.EDGE);

  // Calculate the left edge of the inline toolbar.
  var clientRect = this.inlineToolbar.getClientRects()[0];
  var toolbarHeight = clientRect.height;
  var toolbarWidth = clientRect.width;
  var left = ((bounds.left + bounds.right) / 2) - toolbarWidth / 2;

  // Offset the top bound with the scrolled amount of the page.
  var top = bounds.top + window.pageYOffset - toolbarHeight - 10;

  this.setToolbarPosition(this.inlineToolbar, top, left);
};


/**
 * Reposition block formatting toolbar and hides inline toolbar.
 */
Formatting.prototype.repositionBlockToolbar = function() {
  var selection = this.editor.article.selection;
  var paragraph = selection.getParagraphAtStart();
  var bounds = paragraph.dom.getBoundingClientRect();

  // Hide inline formatting toolbar.
  this.setToolbarPosition(
      this.inlineToolbar, Formatting.EDGE, Formatting.EDGE);

  // Offset the top bound with the scrolled amount of the page.
  var top = bounds.top + window.pageYOffset;

  this.setToolbarPosition(this.blockToolbar, top, bounds.left);

  // Update the active buttons on block toolbar.
  this.reloadBlockToolbarStatus(this.blockToolbar);
};


/**
 * Reloads the status of the block toolbar and selects the active action.
 */
Formatting.prototype.reloadBlockToolbarStatus = function() {
  var selection = this.editor.article.selection;
  var paragraph = selection.getParagraphAtStart();
  var activeAction = this.getFormatterForValue(paragraph.paragraphType);
  this.setToolbarActiveAction(this.blockToolbar, activeAction);
};


/**
 * Reloads the status of the inline toolbar and selects the active action.
 */
Formatting.prototype.reloadInlineToolbarStatus = function() {
  var selection = this.editor.article.selection;
  var paragraph = selection.getParagraphAtStart();
  var formatter = paragraph.getSelectedFormatter(selection);
  var activeAction = null;
  var attrs = null;
  if (formatter) {
    activeAction = this.getFormatterForValue(formatter.type);
    attrs = formatter.attrs;
  }

  this.setToolbarActiveAction(
      this.inlineToolbar, activeAction, attrs);
};


/**
 * Reloads the status of the block toolbar buttons.
 * @param {HTMLElement} toolbar Toolbar to reload its status.
 */
Formatting.prototype.setToolbarActiveAction = function(
    toolbar, activeAction, optAttrs) {
  // Reset the old activated button and fields to deactivate it.
  var oldActiveButton = toolbar.querySelector(
      'button.' + Formatting.ACTIVE_ACTION_CLASS);
  var oldActiveFields = toolbar.querySelector(
      '.extra-fields.' + Formatting.ACTIVE_ACTION_CLASS);
  if (oldActiveButton) {
    oldActiveButton.classList.remove(Formatting.ACTIVE_ACTION_CLASS);
  }
  if (oldActiveFields) {
    oldActiveFields.classList.remove(Formatting.ACTIVE_ACTION_CLASS);
  }

  if (activeAction) {
    // Activate the current paragraph block formatted button.
    var activeButton = toolbar.querySelector(
        '[value=' + activeAction.value + ']');
    if (activeButton) {
      activeButton.classList.add(Formatting.ACTIVE_ACTION_CLASS);
    }

    var activeFields = toolbar.querySelector(
        '.extra-fields.' + activeAction.label);
    if (activeFields) {
      activeFields.classList.add(Formatting.ACTIVE_ACTION_CLASS);

      var fields = activeFields.querySelectorAll('input');
      var i;
      if (optAttrs) {
        for (i = 0; i < fields.length; i++) {
          fields[i].value = optAttrs[fields[i].name];
        }
      } else {
        for (i = 0; i < fields.length; i++) {
          fields[i].value = '';
        }
      }
    }
  }
};


/**
 * Positions a toolbar to a specific location.
 * @param {HTMLElement} toolbar The toolbar to position.
 * @param {number} top Top offset of the toolbar.
 * @param {number} left Left offset of the toolbar.
 */
Formatting.prototype.setToolbarPosition = function(toolbar, top, left) {
  toolbar.style.top = top + 'px';
  toolbar.style.left = left + 'px';
};


/**
 * Handles block formatter button clicked.
 * @param  {Event} event Click event.
 */
Formatting.prototype.handleBlockFormatterClicked = function(event) {
  var clickedFormatter = event.target.getAttribute('value');
  this.handleBlockFormatting(clickedFormatter);
  this.reloadBlockToolbarStatus();
  event.preventDefault();
  event.stopPropagation();
};


/**
 * Creates the actual operations needed to execute block formatting.
 * @param  {string} Formatter to format the paragraph with.
 */
Formatting.prototype.handleBlockFormatting = function(clickedFormatter) {
  var selection = this.editor.article.selection;
  var paragraphs = selection.getSelectedParagraphs();
  var ops = [];

  for (var i = 0; i < paragraphs.length; i++) {
    var toType = clickedFormatter;
    if (paragraphs[i].paragraphType === clickedFormatter) {
      toType = Paragraph.Types.Paragraph;
    }

    // Step 0: updateParagraph to remove content the old one.
    var index = paragraphs[i].section.paragraphs.indexOf(paragraphs[i]) + i;
    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: paragraphs[i].name,
        value: '',
        cursorOffset: 0
      },
      undo: {
        op: 'updateParagraph',
        paragraph: paragraphs[i].name,
        value: paragraphs[i].text,
        cursorOffset: selection.end.offset
      }
    });

    // Step 1: deleteParagraph to remove current Paragraph.
    ops.push({
      do: {
        op: 'deleteParagraph',
        paragraph: paragraphs[i].name
      },
      undo: {
        op: 'insertParagraph',
        section: paragraphs[i].section.name,
        index: index,
        paragraph: paragraphs[i].name,
        paragraphType: paragraphs[i].paragraphType
      }
    });

    // Step 2: insertParagraph to Insert a new Paragraph in its place with the
    // new paragraph type. Make sure to keep the name of the paragraph.
    ops.push({
      do: {
        op: 'insertParagraph',
        section: paragraphs[i].section.name,
        paragraph: paragraphs[i].name,
        index: index,
        paragraphType: toType
      },
      undo: {
        op: 'deleteParagraph',
        paragraph: paragraphs[i].name,
      }
    });

    // Step 3: updateParagraph to update with the content of the old one.
    ops.push({
      do: {
        op: 'updateParagraph',
        paragraph: paragraphs[i].name,
        value: paragraphs[i].text,
        cursorOffset: selection.end.offset
      },
      undo: {
        op: 'updateParagraph',
        paragraph: paragraphs[i].name,
        value: '',
        cursorOffset: 0
      }
    });
  }

  // Execute the transaction.
  this.editor.article.transaction(ops);

  // Tell listeners that there was a change in the editor.
  this.editor.dispatchEvent(new Event('change'));
};


/**
 * Applies an inline formatter to a paragraph.
 * @param  {Paragraph} paragraph A paragraph object to apply to format to.
 * @param  {Selection} selection The current selection to apply format to.
 * @param  {Object} format Format object describing the format.
 * @return {Array.<Object>} A list of operations describing the change.
 */
Formatting.prototype.format = function(paragraph, selection, format) {
  var ops = [], newDo, newUndo, newOp;

  var defaultDo = {
    op: 'updateParagraph',
    paragraph: paragraph.name,
    cursorOffset: selection.start.offset,
    selectRange: selection.end.offset - selection.start.offset,
    formats: []
  };

  // See the range already formatted in a similar type.
  var existingFormats = paragraph.getFormattedRanges(format, true);
  if (existingFormats && existingFormats.length) {

    for (var i = 0; i < existingFormats.length; i++) {
      var existingFormat = existingFormats[i];
      // If attrs were passed with the format just update the attributes.
      if (format.attrs) {
        newDo = Utils.clone(defaultDo);
        var doFormat = Utils.clone(existingFormat);
        doFormat.attrs = format.attrs;
        newDo.formats.push(doFormat);

        newUndo = Utils.clone(defaultDo);
        newUndo.formats.push(Utils.clone(existingFormat));
      }

      // If the format is re-applied to the same range remove the format.
      else if (format.to === existingFormat.to &&
          format.from === existingFormat.from) {
        newDo = Utils.clone(defaultDo);
        newDo.formats.push(Utils.clone(format));
        newUndo = newDo;
      } else if (format.to === existingFormat.to) {
        newDo = Utils.clone(defaultDo);
        newDo.formats.push(format);
        newUndo = newDo;
      } else if (format.from === existingFormat.from) {
        newDo = Utils.clone(defaultDo);
        newDo.formats.push(format);
        newUndo = newDo;
      }
      // If the selected range is already formatted and is in the middle split
      // the old format to unformat the selected range.
      else if (format.to < existingFormat.to &&
               format.from > existingFormat.from) {

        newDo = Utils.clone(defaultDo);
        newDo.formats.push(existingFormat);
        newDo.formats.push({
          type: existingFormat.type,
          from: existingFormat.from,
          to: format.from,
          attrs: format.attrs
        });
        newDo.formats.push({
          type: existingFormat.type,
          from: format.to,
          to: existingFormat.to,
          attrs: format.attrs
        });

        newUndo = Utils.clone(newDo);
        newUndo.formats.reverse();
      } else {
        newDo = Utils.clone(defaultDo);
        newDo.formats.push(existingFormat);
        newDo.formats.push({
          type: existingFormat.type,
          from: Math.min(existingFormat.from, format.from),
          to: Math.max(existingFormat.to, format.to)
        });

        newUndo = Utils.clone(newDo);
        newUndo.formats.reverse();
      }
    }
  } else {
    // Clear all formats touching the range and apply the new format.
    var unformatRanges = paragraph.getFormatsForRange(format.from, format.to);
    newDo = Utils.clone(defaultDo);
    Array.prototype.push.apply(newDo.formats, unformatRanges);
    // Apply the requested format.
    newDo.formats.push(format);

    newUndo = Utils.clone(newDo);
    // Remove attrs from the format in Undo to signal a non-update operation
    // e.g. Remove this formatting.
    delete newUndo.formats[newUndo.formats.length - 1].attrs;
    newUndo.formats.reverse();
  }

  newOp = {
    do: newDo,
    undo: newUndo
  };
  ops.push(newOp);


  return ops;
};


/**
 * Handles inline formatter buttons clicks.
 * @param  {Event} event Click event.
 */
Formatting.prototype.handleInlineFormatterClicked = function(event) {
  var clickedFormatter = event.target.getAttribute('value');
  var action = this.getFormatterForValue(clickedFormatter);
  if (!action.attrs) {
    this.handleInlineFormatting(clickedFormatter);
    this.reloadInlineToolbarStatus();
  } else {
    var selection = this.editor.article.selection;
    var paragraph = selection.getParagraphAtStart();
    var activeAction = paragraph.getSelectedFormatter(selection);

    // If the formatter is already applied, remove the formatting.
    if (activeAction && clickedFormatter === activeAction.type) {
      this.handleInlineFormatting(clickedFormatter);
    } else {
      this.focusOnExtraFieldsFor(this.inlineToolbar, action);
    }
  }
  event.preventDefault();
  event.stopPropagation();
};


/**
 * Creates the actual operations needed to execute inline formatting.
 * @param  {string} clickedFormatter formatter value string.
 * @param {Array.<Object>} optAttrs Attributes to add to the formatting.
 */
Formatting.prototype.handleInlineFormatting = function(
    clickedFormatter, optAttrs) {
  var selection = this.editor.article.selection;
  var currentParagraph = selection.getParagraphAtStart();
  var format = {
    type: clickedFormatter,
    from: selection.start.offset,
    to: selection.end.offset,
    attrs: optAttrs
  };

  // If there's no selection no need to format.
  if (selection.end.offset - selection.start.offset === 0) {
    return;
  }

  var ops = this.format(currentParagraph, selection, format);
  this.editor.article.transaction(ops);

  // Tell listeners that there was a change in the editor.
  this.editor.dispatchEvent(new Event('change'));
};


/**
 * Handles keyboard shortcut event.
 * @param  {Event} event Keyboard event.
 */
Formatting.prototype.handleKeyboardShortcut = function(event) {
  var shortcutId = this.editor.shortcutsManager.getShortcutId(event);

  var inlineFormatter = this.getInlineFormatterForShortcut(shortcutId);
  if (inlineFormatter) {
    this.handleInlineFormatting(inlineFormatter.value);
    return false;
  }

  var blockFormatter = this.getBlockFormatterForShortcut(shortcutId);
  if (blockFormatter) {
    this.handleBlockFormatting(blockFormatter.value);
    return false;
  }

  return true;
};


/**
 * Returns the matched inline formatter for the shortcut.
 * @param  {string} shortcutId Shortcut ID to find the formatter for.
 * @return {Object|null} Inline formatter for the shortcut.
 */
Formatting.prototype.getInlineFormatterForShortcut = function(shortcutId) {
  var inlineFormatters = Formatting.Actions.Inline;
  for (var i = 0; i < inlineFormatters.length; i++) {
    if (inlineFormatters[i].shortcuts.indexOf(shortcutId) !== -1) {
      return inlineFormatters[i];
    }
  }
  return null;
};


/**
 * Returns the matched block formatter for the shortcut.
 * @param  {string} shortcutId Shortcut ID to find the formatter for.
 * @return {Object|null} Block formatter for the shortcut.
 */
Formatting.prototype.getBlockFormatterForShortcut = function(shortcutId) {
  var blockFormatters = Formatting.Actions.Block;
  for (var i = 0; i < blockFormatters.length; i++) {
    if (blockFormatters[i].shortcuts.indexOf(shortcutId) !== -1) {
      return blockFormatters[i];
    }
  }
  return null;
};


/**
 * Returns the action with the specified value;
 * @param  {string} value The value to return action for.
 * @return {Object} Action formatter object.
 */
Formatting.prototype.getFormatterForValue = function(value) {
  var blockFormatters = Formatting.Actions.Block;
  for (var i = 0; i < blockFormatters.length; i++) {
    if (blockFormatters[i].value === value) {
      return blockFormatters[i];
    }
  }

  var inlineFormatters = Formatting.Actions.Inline;
  for (i = 0; i < inlineFormatters.length; i++) {
    if (inlineFormatters[i].value === value) {
      return inlineFormatters[i];
    }
  }
  return null;
};

},{"../paragraph":6,"../selection":8,"../utils":9}],4:[function(require,module,exports){
'use strict';


/**
 * Shortcut manager that manages the registeration and delivery of shortcuts
 * events triggered on the editor.
 * @param {Editor} editor The editor to manage the shortcuts for.
 */
var ShortcutsManager = function(editor) {

  /**
   * The editor to manage the shortcuts for.
   * @type {Editor}
   */
  this.editor = editor;

  /**
   * Registery to keep track of registered events and its listeners.
   * @type {Object.<Function>}
   */
  this.registery = {};

  this.editor.element.addEventListener(
      'keydown', this.handleKeyDownEvent.bind(this));
};
module.exports = ShortcutsManager;


/**
 * Main meta keys used for shortcuts (Shift, Ctrl, Cmd).
 * @type {Array}
 */
ShortcutsManager.META_KEYS = [16, 17, 91];


/**
 * Generates a shortcut ID string for the keyboard event.
 * @param  {Event} event Keyboard event.
 * @return {string} Generated shortcut ID (e.g. cmd+shift+a).
 */
ShortcutsManager.prototype.getShortcutId = function(event) {
  var keys = [];
  var keyCode = event.keyCode || event.which;
  if (ShortcutsManager.META_KEYS.indexOf(keyCode) !== -1) {
    return false;
  }

  if (event.metaKey) {
    keys.push('cmd');
  }

  if (event.ctrlKey) {
    keys.push('ctrl');
  }

  if (event.shiftKey) {
    keys.push('shift');
  }

  if (event.altKey) {
    keys.push('alt');
  }

  keys.sort();

  if (keyCode) {
    keys.push(String.fromCharCode(keyCode));
  }

  return keys.join('+').toLowerCase();
};


/**
 * Checks if the current event is for a shortcut.
 * @param  {Event} event Keyboard event shortcut.
 * @return {boolean} True if the shortcut is for the event.
 */
ShortcutsManager.prototype.isShortcutEvent = function(event) {
  var keyCode = event.keyCode || event.which;
  return ((event.metaKey || event.ctrlKey) && keyCode &&
          (ShortcutsManager.META_KEYS.indexOf(keyCode) === -1));
};


/**
 * Handles keydown events.
 * @param  {Event} event Keyboard event.
 * @return {boolean} True if the event wasn't handled and should bubble up.
 */
ShortcutsManager.prototype.handleKeyDownEvent = function(event) {
  if (this.isShortcutEvent(event)) {
    var shortcutId = this.getShortcutId(event);

    // If the shortcut is registered.
    if (this.registery[shortcutId]) {

      // Call the listener callback method passing the event.
      var returnValue = this.registery[shortcutId](event);

      // Stop the event from bubbling up if it was handled.
      if (returnValue === false) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }
  }

  // Not handled bubble it up.
  return true;
};


/**
 * Registers a handler for a shortcut.
 * @param  {string} shortcutId A shortcut ID to listen to.
 * @param  {Function} handler Callback handler for the shortcut.
 * @param  {boolean=} optForce Optional parameter to force replacing an already
 * existing shortcut listener.
 */
ShortcutsManager.prototype.register = function(shortcutId, handler, optForce) {

  // If the shortcut already registered throw an error.
  if (this.registery[shortcutId] && !optForce) {
    throw '"' + shortcutId + '" shortcut has already been registered.';
  }

  this.registery[shortcutId] = handler;
};

},{}],5:[function(require,module,exports){
'use strict';

module.exports.Editor = require('./editor');
module.exports.Article = require('./article');
module.exports.Paragraph = require('./paragraph');
module.exports.Section = require('./section');
module.exports.Selection = require('./selection');
module.exports.Formatting = require('./extensions/formatting');

},{"./article":1,"./editor":2,"./extensions/formatting":3,"./paragraph":6,"./section":7,"./selection":8}],6:[function(require,module,exports){
'use strict';

var Utils = require('./utils');


/**
 * Paragraph main.
 * @param {Object} optParams Optional params to initialize the Paragraph object.
 * Default:
 *   {
 *     text: '',
 *     placeholderText: null,
 *     paragraphType: Paragraph.Types.Paragraph,
 *     name: Utils.getUID()
 *   }
 */
var Paragraph = function(optParams) {
  // Override default params with passed ones if any.
  var params = Utils.extend({
    // Text rendered in this paragraph.
    text: '',
    // If you want to show a placeholder if there was no text.
    placeholderText: null,
    // Paragraph Type one of Paragraph.Types string.
    paragraphType: Paragraph.Types.Paragraph,
    // Generate a UID as a reference for this paragraph.
    name: Utils.getUID()
  }, optParams);

  /**
   * Name to reference this paragraph.
   * @type {string}
   */
  this.name = params.name;
  Utils.setReference(this.name, this);

  /**
   * Internal model text in this paragraph.
   * @type {string}
   */
  this.text = params.text;

  /**
   * Placeholder text to show if the paragraph is empty.
   * @type {string}
   */
  this.placeholderText = params.placeholderText;

  /**
   * Inline formats for the paragraph.
   * @type {Array.<Object>}
   */
  this.formats = [];

  this.metadata = {};
  this.layout = {};

  /**
   * Section this paragraph belongs to.
   * @type {Section}
   */
  this.section = null;

  /**
   * Paragraph type.
   * @type {string}
   */
  this.paragraphType = params.paragraphType;

  /**
   * DOM element tied to this object.
   * @type {HTMLElement}
   */
  this.dom = document.createElement(this.paragraphType);
  this.dom.setAttribute('name', this.name);

  if (this.placeholderText) {
    this.dom.setAttribute('placeholder', this.placeholderText);
  } else if (!this.text.length) {
    // Content Editable won't be able to set the cursor for an empty element
    // so we use the zero-length character to workaround that.
    this.dom.innerHTML = '&#8203;';
  }

  this.setText(params.text);
};
module.exports = Paragraph;

// TODO(mkhatib): Maybe define each type as a new function
// instead of putting all the logic for rendering all of these
// under Paragraph.
/**
 * Differet types of a paragraph.
 * @type {Enum}
 */
Paragraph.Types = {
  Paragraph: 'p',
  MainHeader: 'h1',
  SecondaryHeader: 'h2',
  ThirdHeader: 'h3',
  Quote: 'blockquote',
  Code: 'pre'
};


/**
 * Updates the text for the paragraph.
 * @param {string} text Text to update to.
 */
Paragraph.prototype.setText = function(text) {
  this.text = text || '';
  if (!this.text.length && !this.placeholderText) {
    this.dom.innerHTML = '&#8203;';
  } else {
    this.dom.innerText = this.text;
  }
};


/**
 * Inserts characters at a specific index.
 * @param  {string} chars A string representing the characters to insert.
 * @param  {number} index Start index to insert characters at.
 */
Paragraph.prototype.insertCharactersAt = function(chars, index) {
  var texts = [this.text.substring(0, index), this.text.substring(index)];
  var updatedText = texts.join(chars);

  this.shiftFormatsFrom_(index, chars.length);
  this.setText(updatedText);
  this.updateInnerDom_();
};


/**
 * Removes number of characters starting from an index.
 * @param  {number} index Start index to start removing characters at.
 * @param  {number} count Number of characters to remove.
 */
Paragraph.prototype.removeCharactersAt = function(index, count) {
  var texts = [this.text.substring(0, index), this.text.substring(index + count)];
  var updatedText = texts.join('');

  this.shiftFormatsFrom_(index, -1 * count);
  this.setText(updatedText);
  this.updateInnerDom_();
};


/**
 * Shift the formats representations by an amount starting from an index.
 * @param  {number} startIndex Start index to start shifting at.
 * @param  {number} shift A positive or negative shift to add to formats index.
 * @private
 */
Paragraph.prototype.shiftFormatsFrom_ = function(startIndex, shift) {
  var toRemove = [];
  for (var i = 0; i < this.formats.length; i++) {
    // If the format is in the range being shifted, remove it.
    if (startIndex <= this.formats[i].from &&
        startIndex - shift >= this.formats[i].to) {
      toRemove.push(i);
    }
    if (this.formats[i].from >= startIndex) {
      this.formats[i].from += shift;
    }
    if (this.formats[i].to > startIndex) {
      this.formats[i].to += shift;
    }
  }

  for (i = 0; i < toRemove.length; i++) {
    this.formats.splice(toRemove[i], 1);
  }
};


/**
 * Updates the inner dom representation of the paragraph to apply formats
 * attached to this paragraph.
 * @private
 */
Paragraph.prototype.updateInnerDom_ = function () {
  if (!this.formats.length) {
    this.setText(this.text);
    return;
  }

  var newDom = document.createElement(this.paragraphType);
  var formatOpen = 0;
  var formatClose = 0;
  var text;
  for (var i = 0; i < this.formats.length; i++) {
    formatOpen = this.formats[i].from;
    if (formatOpen - formatClose > 0) {
      text = this.text.substring(formatClose, formatOpen);
      newDom.appendChild(document.createTextNode(text));
    }
    formatClose = this.formats[i].to;
    var formatEl = document.createElement(this.formats[i].type);
    for (var attr in this.formats[i].attrs) {
      formatEl.setAttribute(attr, this.formats[i].attrs[attr]);
    }
    formatEl.innerText = this.text.substring(formatOpen, formatClose);
    newDom.appendChild(formatEl);
  }
  var length = this.text.length;
  if (length - formatClose > 0) {
    text = this.text.substring(length, formatClose);
    newDom.appendChild(document.createTextNode(text));
  }
  this.dom.innerHTML = newDom.innerHTML;
};


/**
 * Whether this is a placeholder element.
 * @return {boolean} True if has placeholder text and no input text.
 */
Paragraph.prototype.isPlaceholder = function() {
  return !!this.placeholderText && !this.text.length;
};


/**
 * Get the next paragraph if any.
 * @return {Paragraph} Next sibling paragraph.
 */
Paragraph.prototype.getNextParagraph = function() {
  if (this.section) {
    var i = this.section.paragraphs.indexOf(this);
    return this.section.paragraphs[i + 1];
  }
};


/**
 * Get the previous paragraph if any.
 * @return {Paragraph} Previous sibling paragraph.
 */
Paragraph.prototype.getPreviousParagraph = function() {
  if (this.section) {
    var i = this.section.paragraphs.indexOf(this);
    return this.section.paragraphs[i - 1];
  }
};


/**
 * Applies a list of formats to this paragraph.
 * @param  {Array.<Object>} formats A list of format objects to apply.
 */
Paragraph.prototype.applyFormats = function(formats) {
  for (var i = 0; i < formats.length; i++) {
    this.format(formats[i]);
  }
};


/**
 * Returns the currently selected formatter in the range.
 * @param {Selection} selection Selection to get formatter at.
 * @return {Object|null} Currently selected formatter.
 */
Paragraph.prototype.getSelectedFormatter = function(selection) {
  for (var i = 0; i < this.formats.length; i++) {
    if (selection.start.offset >= this.formats[i].from &&
        selection.start.offset < this.formats[i].to &&
        selection.end.offset > this.formats[i].from &&
        selection.end.offset <= this.formats[i].to) {
      return this.formats[i];
    }
  }

  return null;
};


/**
 * Applies a format to this paragraph. This could add, remove or subtract from
 * the formats on the paragraph.
 * @param  {Object} format A format objects to apply.
 */
Paragraph.prototype.format = function(format, clear) {
  // See the range already formatted in a similar type.
  format = Utils.clone(format);
  var originalExistingFormats = this.getFormattedRanges(format, !clear);
  if (originalExistingFormats && originalExistingFormats.length) {
    var existingFormats = Utils.clone(originalExistingFormats);
    for (var i = 0; i < existingFormats.length; i++) {
      var existingFormat = existingFormats[i];
      var index = this.formats.indexOf(originalExistingFormats[i]);
      // If attrs were passed with the format just update the attributes.
      if (format.attrs) {
        existingFormat.attrs = format.attrs;
        this.formats[index] = existingFormat;
      }
      // If the format is re-applied to the same range remove the format.
      else if (format.to === existingFormat.to &&
          format.from === existingFormat.from) {
        this.formats.splice(index, 1);
      } else if (format.to === existingFormat.to || (
          format.to > existingFormat.to &&
          format.from < existingFormat.to && clear)) {
        existingFormat.to = format.from;
        this.formats[index] = existingFormat;
      } else if (format.from === existingFormat.from || (
          format.from < existingFormat.from &&
          format.to > existingFormat.from && clear)) {
        existingFormat.from = format.to;
        this.formats[index] = existingFormat;
      }
      // If the selected range is already formatted and is in the middle split
      // the old format to unformat the selected range.
      else if (format.to < existingFormat.to &&
               format.from > existingFormat.from) {

        this.formats.splice(index, 1);

        this.addNewFormatting({
            type: existingFormat.type, from: existingFormat.from, to: format.from });

        this.addNewFormatting({
            type: existingFormat.type, from: format.to, to: existingFormat.to });
      } else {
        if (!clear) {
          existingFormat.from = Math.min(existingFormat.from, format.from);
          existingFormat.to = Math.max(existingFormat.to, format.to);
          this.formats[index] = existingFormat;
        } else {
          this.formats.splice(index, 1);
        }
      }
    }
  } else {
    var formattedRanges = this.getFormattedRanges(format, false);
    if (!formattedRanges || !formattedRanges.length) {
      this.addNewFormatting(format);
    } else {
      // Clear all formats touching the range and apply the new format.
      if (!clear) {
        this.format(format, true);
        this.format(format);
      }
    }
  }

  if (!clear) {
    this.normalizeFormats_();
  }
  this.updateInnerDom_();
};


/**
 * Merges similar formats that overlaps together.
 */
Paragraph.prototype.normalizeFormats_ = function() {
  if (!this.formats || !this.formats.length) {
    return;
  }

  var newFormats = [Utils.clone(this.formats[0])];
  for (var i = 1; i < this.formats.length; i++) {
    if ((newFormats[newFormats.length - 1].to > this.formats[i].from) ||
        (newFormats[newFormats.length - 1].to === this.formats[i].from &&
         newFormats[newFormats.length - 1].type === this.formats[i].type)) {
      newFormats[newFormats.length - 1].to = this.formats[i].to;
    } else {
      newFormats.push(Utils.clone(this.formats[i]));
    }
  }

  this.formats = newFormats;
};


/**
 * Returns formats representing the range given.
 * @param  {number} from Where to start.
 * @param  {number} to Where to end.
 * @return {Array.<Object>} List of formats representing that range formats.
 */
Paragraph.prototype.getFormatsForRange = function(from, to) {
  var finalFormats = [];
  var rangeFormats = this.getFormattedRanges({
    from: from,
    to: to,
    type: null
  }, false);

  rangeFormats = Utils.clone(rangeFormats);
  for (var j = 0; j < rangeFormats.length; j++) {
    if (rangeFormats[j].from < from && rangeFormats[j].to >= from) {
      rangeFormats[j].from = from;
    }

    if (rangeFormats[j].to > to && rangeFormats[j].from <= to) {
      rangeFormats[j].to = to;
    }

    if (rangeFormats[j].from < rangeFormats[j].to) {
      finalFormats.push(rangeFormats[j]);
    }
  }

  return finalFormats;
};


/**
 * Finds if the paragraph has formatted regions in the format range.
 * @param  {Object} format The format to check in its range.
 * @param  {boolean=} matchType Whether to check for type match.
 * @return {Array.<Object>} List of formats that overlap the format.
 */
Paragraph.prototype.getFormattedRanges = function(format, matchType) {
  var matchingFormats = [];
  var matchingFormatsWithType = [];
  for (var i = 0; i < this.formats.length; i++) {
    // Out of range so no simialr format.
    if (this.formats[i].from > format.to) {
      continue;
    }
    if (
        // Range inside or on the border of already formatted area.
        (this.formats[i].from < format.from &&
         this.formats[i].to >= format.to) ||

        // Range contains an already format area.
        (this.formats[i].from >= format.from &&
         this.formats[i].to <= format.to) ||

        // Range is partially formatted to the left.
        (this.formats[i].to > format.from &&
         this.formats[i].to <= format.to &&
         this.formats[i].from < format.from) ||

        // Range is partially formatted to the right.
        (this.formats[i].from >= format.from &&
         this.formats[i].from < format.to &&
         this.formats[i].to > format.to)) {

      matchingFormats.push(this.formats[i]);

      if (this.formats[i].type === format.type) {
        matchingFormatsWithType.push(this.formats[i]);
      }
    }
  }

  if (matchType) {
    if (matchingFormatsWithType.length === matchingFormats.length) {
      return matchingFormatsWithType;
    }
  } else {
    return matchingFormats;
  }
};


/**
 * Adds and sorts the formatting to be in the correct order.
 * @param {Object} format The new formatter to add.
 */
Paragraph.prototype.addNewFormatting = function(format) {
  this.formats.push(format);
  this.formats.sort(function(formatA, formatB) {
    var result = formatA.from - formatB.from;
    if (!result) {
      if (formatA.type > formatB.type) {
        result = 1;
      } else if (formatA.type < formatB.type) {
        result = -1;
      } else {
        result = 0;
      }
    }
    return result;
  });
};


/**
 * Creates and return a JSON representation of the model.
 * @return {Object} JSON representation of this paragraph.
 */
Paragraph.prototype.getJSONModel = function() {
  var paragraph = {
    name: this.name,
    text: this.text,
    paragraphType: this.paragraphType
  };

  if (this.formats) {
    paragraph.formats = this.formats;
  }

  return paragraph;
};

},{"./utils":9}],7:[function(require,module,exports){
'use strict';

var Selection = require('./selection');
var Utils = require('./utils');


/**
 * Section main.
 * @param {Object} optParams Optional params to initialize the Section object.
 * Default:
 *   {
 *     paragraphs: [],
 *     backgorund: {},
 *     name: Utils.getUID()
 *   }
 */
var Section = function(optParams) {
  // Override default params with passed ones if any.
  var params = Utils.extend({
    // The paragraphs that is in this section.
    paragraphs: [],
    // The background of this section.
    background: {},
    // Generate a UID as a reference for this section.
    name: Utils.getUID()
  }, optParams);

  /**
   * Name to reference this Section.
   * @type {string}
   */
  this.name = params.name;
  Utils.setReference(this.name, this);

  /**
   * Background settings
   * @type {Object}
   */
  this.background = params.background;

  /**
   * DOM element tied to this object.
   * @type {HTMLElement}
   */
  this.dom = document.createElement(Section.TAG_NAME);
  this.dom.setAttribute('name', this.name);

  /**
   * The section paragraphs.
   * @type {Array.<Paragraph>}
   */
  this.paragraphs = [];
  for (var i = 0; i < params.paragraphs.length; i++) {
    this.insertParagraphAt(params.paragraphs[i], i);
  }

};
module.exports = Section;

/**
 * Element Tag name when creating the associated DOM element.
 * @type {String}
 */
Section.TAG_NAME = 'section';


/**
 * Inserts a paragraph in the section.
 * @param  {Paragraph} paragraph Paragraph to insert.
 * @param  {number} index Where to insert the paragraph.
 * @return {Paragraph} The inserted paragraph.
 */
Section.prototype.insertParagraphAt = function(paragraph, index) {
  // Update paragraph section reference to point to this section.
  paragraph.section = this;

  // Get current paragraph and its index in the section.
  var nextParagraph = this.paragraphs[index];

  if (!nextParagraph) {
    // If the last paragraph in the section append it to the section.
    this.dom.appendChild(paragraph.dom);
  } else {
    // Otherwise insert it before the next paragraph.
    this.dom.insertBefore(paragraph.dom, nextParagraph.dom);
  }

  this.paragraphs.splice(index, 0, paragraph);

  // Set the cursor to the new paragraph.
  Selection.getInstance().setCursor({
    paragraph: paragraph,
    offset: 0
  });

  return paragraph;
};

/**
 * Removes a paragraph from a section.
 * @param  {Paragraph} paragraph To remove from section.
 * @return {Paragraph} Removed paragraph.
 */
Section.prototype.removeParagraph = function(paragraph) {
  var index = this.paragraphs.indexOf(paragraph);
  var removedParagraph = this.paragraphs.splice(index, 1)[0];
  try {
    this.dom.removeChild(removedParagraph.dom);
  } catch (e) {
    if (e.name === 'NotFoundError') {
      console.warn('The browser might have already handle removing the DOM ' +
        ' element (e.g. When handling cut).');
    } else {
      throw e;
    }
  }
  return removedParagraph;
};


/**
 * Returns paragraphs from a section between two paragraphs (exclusive).
 * @param  {Paragraph} startParagraph Starting paragraph.
 * @param  {Paragraph} endParagraph Ending paragraph.
 */
Section.prototype.getParagraphsBetween = function(
    startParagraph, endParagraph) {
  var paragraphs = [];
  var startIndex = this.paragraphs.indexOf(startParagraph) + 1;
  var endIndex = this.paragraphs.indexOf(endParagraph);
  for (var i = startIndex; i < endIndex; i++) {
    paragraphs.push(this.paragraphs[i]);
  }
  return paragraphs;
};


/**
 * Creates and return a JSON representation of the model.
 * @return {Object} JSON representation of this section.
 */
Section.prototype.getJSONModel = function() {
  var section = {
    paragraphs: []
  };

  for (var i = 0; i < this.paragraphs.length; i++) {
    section.paragraphs.push(this.paragraphs[i].getJSONModel());
  }

  return section;
};

},{"./selection":8,"./utils":9}],8:[function(require,module,exports){
'use strict';

var Utils = require('./utils');


/**
 * Selection singletone class.
 */
var Selection = (function() {


    /** Singletone Constructor. */
    var Selection = function() {

      /**
       * Selection start point.
       * @type {Object}
       */
      this.start = {
        paragraph: null,
        offset: null
      };

      /**
       * Selection end point.
       * @type {Object}
       */
      this.end = {
        paragraph: null,
        offset: null
      };
    };

    Selection.prototype = new Utils.CustomEventTarget();

    /**
     * Differet types of selection events.
     * @type {Enum}
     */
    Selection.Events = {
      SELECTION_CHANGED: 'selectionchanged'
    };

    /**
     * Resets selection start and end point.
     */
    Selection.prototype.reset = function() {
      this.start = {
        paragraph: null,
        offset: null
      };

      this.end = {
        paragraph: null,
        offset: null
      };
    };

    /**
     * Returns the paragraph object at the start of the selection.
     * @return {Paragraph} The paragraph object at the start of selection.
     */
    Selection.prototype.getParagraphAtStart = function() {
      if (this.start) {
        return this.start.paragraph;
      }
    };


    /**
     * Returns the paragraph object at the end of the selection.
     * @return {Paragraph} The paragraph object at the end of selection.
     */
    Selection.prototype.getParagraphAtEnd = function() {
      if (this.end) {
        return this.end.paragraph;
      }
    };


    /**
     * Returns the list of paragraphs in the selection.
     * @return {Array.<Paragraph>} List of paragraphs selected.
     */
    Selection.prototype.getSelectedParagraphs = function() {
      var startParagraph = this.start.paragraph;
      var endParagraph = this.end.paragraph;
      var inBetweenParagraphs = this.getSectionAtStart().getParagraphsBetween(
          startParagraph, endParagraph);
      var selectedParagraphs = [startParagraph];
      Array.prototype.push.apply(selectedParagraphs, inBetweenParagraphs);
      if (startParagraph !== endParagraph) {
        selectedParagraphs.push(endParagraph);
      }
      return selectedParagraphs;
    };


    /**
     * Returns the section object at the start of the selection.
     * @return {Section} The section object at the start of selection.
     */
    Selection.prototype.getSectionAtStart = function() {
      if (this.getParagraphAtStart()) {
        return this.getParagraphAtStart().section;
      }
    };


    /**
     * Returns the section object at the end of the selection.
     * @return {Section} The section object at the end of selection.
     */
    Selection.prototype.getSectionAtEnd = function() {
      if (this.getParagraphAtEnd()) {
        return this.getParagraphAtEnd().section;
      }
    };


    /**
     * Selects a range.
     * @param {Object} start An object with `paragraph` and `offset`.
     * @param {Object} end An object with `paragraph` and `offset`.
     */
    Selection.prototype.select = function(start, end) {
      // Update start and end points to the cursor value.
      this.start = {
        paragraph: start.paragraph,
        offset: start.offset
      };

      this.end = {
        paragraph: end.paragraph,
        offset: end.offset
      };

      // Reflect the update to the cursor to the browser selection.
      this.updateWindowSelectionFromModel();
    };


    /**
     * Sets the cursor on the selection.
     * @param {Object} cursor An object with `paragraph` and `offset`.
     */
    Selection.prototype.setCursor = function(cursor) {
      // Update start and end points to the cursor value.
      this.start = {
        paragraph: cursor.paragraph,
        offset: cursor.offset
      };

      this.end = {
        paragraph: cursor.paragraph,
        offset: cursor.offset
      };

      // Reflect the update to the cursor to the browser selection.
      this.updateWindowSelectionFromModel();
    };


    /**
     * Calculates the offset from node starts instead of parents.
     * @param  {HTMLElement} parent Parent HTML element.
     * @param  {number} parentOffset Offset relative to the parent element.
     * @param  {HTMLElement} node Offset to calculate offset relative to.
     * @return {number} The offset relative to the node.
     */
    Selection.prototype.calculateOffsetFromNode = function (
        parent, parentOffset, node) {

      var offset = 0;
      for (var i = 0; i < parent.childNodes.length; i++) {
        var currentNode = parent.childNodes[i];
        if (currentNode === node) {
          break;
        }
        offset += (currentNode.textContent || currentNode.innerText).length;
      }
      return offset;
    };

    /**
     * Updates the window selection from the selection model.
     */
    Selection.prototype.updateWindowSelectionFromModel = function() {
      var range = document.createRange();
      var startNode = this.start.paragraph.dom;
      var startOffset = this.start.offset;
      var endNode = this.end.paragraph.dom;
      var endOffset = this.end.offset;

      // Select the #text node instead of the parent element.
      if (this.start.offset > 0) {
        startNode = this.getTextNodeAtOffset_(
            this.start.paragraph.dom, startOffset);

        // TODO(mkhatib): FIGURE OUT WHY start.offset sometimes larger than
        // the current length of the content. This is a hack to fix not finding
        // the startNode when this happens.
        if (!startNode) {
          startNode = this.getTextNodeAtOffset_(
              this.start.paragraph.dom, startOffset - 1);
        }
        var startPrevSiblingsOffset = this.calculatePreviousSiblingsOffset_(
            this.start.paragraph.dom, // Paragraph node
            startNode); // Start node to calculate new offset from
        startOffset = this.start.offset - startPrevSiblingsOffset;
      }

      try {
        range.setStart(startNode, startOffset);
      } catch (e) {
        range.setStart(startNode, startOffset - 1);
      }

      endNode = this.end.paragraph.dom;
      // Select the #text node instead of the parent element.
      if (this.end.offset > 0) {
        endNode = this.getTextNodeAtOffset_(
            this.end.paragraph.dom, endOffset);
        // TODO(mkhatib): FIGURE OUT WHY end.offset sometimes larger than
        // the current length of the content. This is a hack to fix not finding
        // the endNode when this happens.
        if (!endNode) {
          endNode = this.getTextNodeAtOffset_(
              this.end.paragraph.dom, endOffset - 1);
        }
        var endPrevSiblingsOffset = this.calculatePreviousSiblingsOffset_(
            this.end.paragraph.dom, // Paragraph node
            endNode); // Start node to calculate new offset from
        endOffset = this.end.offset - endPrevSiblingsOffset;
      }
      try {
        range.setEnd(endNode, endOffset);
      } catch (e) {
        range.setEnd(endNode, endOffset - 1);
      }
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    };


    /**
     * Returns the text node at the specified offset.
     * @param  {HTMLElement} parent Parent element.
     * @param  {number} offset Offset relative to parent.
     * @return {HTMLElement} TextNode at the offset.
     */
    Selection.prototype.getTextNodeAtOffset_ = function(parent, offset) {
      var prevOffset = 0;

      for (var i = 0; i < parent.childNodes.length; i++) {
        var currentNode = parent.childNodes[i];

        var currentOffset = (currentNode.textContent || currentNode.innerText).length;
        // In the wanted offset return the found node.
        if (prevOffset + currentOffset >= offset) {
          // If current node is not a text node.
          // recurse(currentNode, offset-prevOffset). If it finds a node return it.
          if (currentNode.nodeName !== '#text') {
            currentNode = this.getTextNodeAtOffset_(
                currentNode, offset - prevOffset);
          }
          return currentNode;
        }
        prevOffset += currentOffset;
      }

      // Didn't find any node at the offset.
      return null;
    };


    /**
     * Calculates start offset from the window selection. Relative to the parent
     * paragaraph currently selected.
     * @param  {Selection} selection Current selection.
     * @return {number} Start offset relative to parent.
     */
    Selection.prototype.calculateStartOffsetFromWindowSelection_ = function (
        selection) {
      // offset from node.
      var startNode = selection.anchorNode;
      var startNodeOffset = selection.anchorOffset;
      var parentNode = startNode.parentNode;

      if ((startNode.getAttribute && startNode.getAttribute('name')) ||
          (startNode.nodeName === '#text' &&
           parentNode.getAttribute('name') &&
           parentNode.childNodes.length < 2)) {
        return startNodeOffset;
      }

      // Get the real paragraph.
      var node = this.getStartParagraphFromWindowSelection_(selection);
      startNodeOffset += this.calculatePreviousSiblingsOffset_(
          node, startNode);
      return startNodeOffset;
    };


    /**
     * Calculates end offset from the window selection. Relative to the parent
     * paragaraph currently selected.
     * @param  {Selection} selection Current selection.
     * @return {number} End offset relative to parent.
     */
    Selection.prototype.calculateEndOffsetFromWindowSelection_ = function (
        selection) {
      var startNode = selection.focusNode;
      var startNodeOffset = selection.focusOffset;
      var parentNode = startNode.parentNode;
      if ((startNode.getAttribute && startNode.getAttribute('name')) ||
          (startNode.nodeName === '#text' &&
           parentNode.getAttribute('name') &&
           parentNode.childNodes.length < 2)) {
        return startNodeOffset;
      }

      // Get the real paragraph.
      var node = this.getEndParagraphFromWindowSelection_(selection);
      startNodeOffset += this.calculatePreviousSiblingsOffset_(node, startNode);
      return startNodeOffset;
    };


    /**
     * Calculates previous siblings offsets sum until a node.
     * @param  {HTMLElement} parent Parent paragraph element.
     * @param  {HTMLElement} node Node to stop at.
     * @return {number} Offset of the previous siblings.
     */
    Selection.prototype.calculatePreviousSiblingsOffset_ = function (
        parent, node) {

      var offset = 0;
      for (var i = 0; i < parent.childNodes.length; i++) {
        var currentNode = parent.childNodes[i];

        // If found the node break and return the calculated offset.
        if (currentNode === node) {
          break;
        }

        // If not a text node recurse to calculate the offset from there.
        if (currentNode.nodeName !== '#text') {
          var currentOffset = (currentNode.textContent ||
              currentNode.innerText).length;

          var childOffset = this.calculatePreviousSiblingsOffset_(
              currentNode, node);

          // If childOffset is smaller than the whole node offset then the node
          // needed is inside the currentNode. Add childOffset to the offset so
          // far and break;
          if (childOffset < currentOffset) {
            offset += childOffset;
            break;
          }
        }

        offset += (currentNode.textContent || currentNode.innerText).length;
      }
      return offset;
    };


    /**
     * Retruns the start paragraph from window selection.
     * @param  {Selection} selection Current selection.
     * @return {HTMLElement} Start paragraph html element.
     */
    Selection.prototype.getStartParagraphFromWindowSelection_ = function (
        selection) {
        var node = selection.anchorNode;
        while (!node.getAttribute ||
               (!node.getAttribute('name') && node.parentNode)) {
          node = node.parentNode;
        }
        return node;
    };


    /**
     * Retruns the end paragraph from window selection.
     * @param  {Selection} selection Current selection.
     * @return {HTMLElement} End paragraph html element.
     */
    Selection.prototype.getEndParagraphFromWindowSelection_ = function (
        selection) {
        var node = selection.focusNode;
        while (!node.getAttribute ||
               (!node.getAttribute('name') && node.parentNode)) {
          node = node.parentNode;
        }
        return node;
    };


    /**
     * Updates the selection start and end point from a change on the browser
     * selection.
     */
    Selection.prototype.updateSelectionFromWindow = function() {
      var selection = window.getSelection();

      // Update the selection start point.
      var startNode = this.getStartParagraphFromWindowSelection_(selection);
      var start = {
        paragraph: Utils.getReference(startNode.getAttribute('name')),
        offset: this.calculateStartOffsetFromWindowSelection_(selection)
      };

      // Update the selection end point.
      var endNode = this.getEndParagraphFromWindowSelection_(selection);
      var end = {
        paragraph: Utils.getReference(endNode.getAttribute('name')),
        offset: this.calculateEndOffsetFromWindowSelection_(selection)
      };

      var endIndex = end.paragraph.section.paragraphs.indexOf(end.paragraph);
      var startIndex = start.paragraph.section.paragraphs.indexOf(
          start.paragraph);
      var reversedSelection = ((end.paragraph === start.paragraph &&
          end.offset < start.offset) || startIndex > endIndex);

      this.end = reversedSelection ? start : end;
      this.start = reversedSelection ? end : start;

      var event = new Event(Selection.Events.SELECTION_CHANGED);
      this.dispatchEvent(event);
    };


    /**
     * Whether the cursor is at beginning of a paragraph.
     * @return {boolean} True if the cursor at the beginning of paragraph.
     */
    Selection.prototype.isCursorAtBeginning = function() {
      return this.start.offset === 0 && this.end.offset === 0;
    };


    /**
     * Whether the cursor is at ending of a paragraph.
     * @return {boolean} True if the cursor at the ending of paragraph.
     */
    Selection.prototype.isCursorAtEnding = function() {
      return (this.start.offset === this.start.paragraph.text.length &&
              this.end.offset === this.end.paragraph.text.length);
    };


    /**
     * Whether the selection is a range.
     * @return {boolean} True if a range is selected.
     */
    Selection.prototype.isRange = function() {
      return (this.start.paragraph != this.end.paragraph ||
              this.start.offset != this.end.offset);
    };


    /**
     * Initialize selection listeners to the element.
     * @param  {HTMLElement} element The html element to listen for selection
     * changes on.
     */
    Selection.prototype.initSelectionListener = function(element) {
      // On `mouseup` the mouse could have been clicked to move the cursor.
      element.addEventListener('mouseup',
          this.updateSelectionFromWindow.bind(this));

      // Clicking a key would probably also cause the cursor to move.
      element.addEventListener('keyup',
          this.updateSelectionFromWindow.bind(this));
    };

    var instance;
    return {
      /**
       * Returns the single instance of Selection.
       * @return {Selection} The selection instance.
       */
      getInstance: function() {
        if (!instance) {
          instance = new Selection();
          // Hide the constructor so the returned object can't be new'd.
          instance.constructor = null;
        }
        return instance;
      },
      Events: Selection.Events
    };

})();
module.exports = Selection;

},{"./utils":9}],9:[function(require,module,exports){
'use strict';

var Utils = {};
module.exports = Utils;

/**
 * Stores global references for retreival.
 * @type {Object}
 */
Utils.GLOBAL_REFERENCE = {};

/**
 * Extends first object with second object and overrides its
 * attributes and returns a new object.
 *
 * Example:
 *
 *   var newObj = Utils.extend({name: 'mk', age: 14}, {name: 'rasha'});
 *   // newObj is now {name: 'rasha', age: 14}
 * @param  {Object} firstObj
 * @param  {Object} secondObj
 * @return {Object} Combined new object.
 */
Utils.extend = function(firstObj, secondObj) {
  var tmpObj = {}, attr;

  for (attr in firstObj) {
    tmpObj[attr] = firstObj[attr];
  }

  for (attr in secondObj) {
    tmpObj[attr] = secondObj[attr];
  }

  return tmpObj;
};


/**
 * Store a global reference for an object.
 * @param {string} key Key to store the object at.
 * @param {Object|string|number} value Any value you'd like to store at key.
 */
Utils.setReference = function(key, value) {
  Utils.GLOBAL_REFERENCE[key] = value;
};


/**
 * Get a global reference for an object.
 * @param {string} key Key to get the object at.
 */
Utils.getReference = function(key) {
  return Utils.GLOBAL_REFERENCE[key];
};


/**
 * Generates a random alphanumeric ID.
 * @param  {number} optLength Length of the ID to generate.
 * @return {string} Random alphanumeric ID.
 */
Utils.getUID = function(optLength) {
  var length = optLength || 4;
  var chars = [];
  var sourceSet = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    chars.push(sourceSet.charAt(Math.floor(Math.random() * sourceSet.length)));
  }

  return chars.join('');
};


/**
 * Whether an event will produce a character or not.
 * @param  {Event} event Keypress event.
 * @return {boolean} True if the key will produce a change.
 */
Utils.willTypeCharacter = function(event) {
  var NO_CHANGE_KEYS = [
    // Command keys.
    16, 17, 18, 19, 20, 27,
    // Pages keys.
    33, 34, 35, 36,
    // Arrow keys.
    37, 38, 39, 40,
    // Other keys.
    45, 91, 92, 93,
    // Funcion Keys F1-F12
    112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123,
    // Locks
    144, 145
  ];

  return (NO_CHANGE_KEYS.indexOf(event.keyCode) === -1 &&
          !event.ctrlKey && !event.metaKey);
};


/**
 * Checks if the event is undo.
 * @param  {Event} event Keypress event.
 * @return {boolean} True if it is undo.
 */
Utils.isUndo = function(event) {
  return !!((event.ctrlKey || event.metaKey) &&
          event.keyCode === 90 && !event.shiftKey);
};


/**
 * Checks if the event is redo.
 * @param  {Event} event Keypress event.
 * @return {boolean} True if it is redo.
 */
Utils.isRedo = function(event) {
  return !!((event.ctrlKey || event.metaKey) &&
          (event.keyCode === 89 ||
           (event.shiftKey && event.keyCode === 90)));
};


/**
 * Makes a copy of the passed object.
 *   Reference: http://stackoverflow.com/a/728694/646979
 * @param  {Object} obj Object to clone.
 * @return {Object} cloned object.
 */
Utils.clone = function(obj) {
  var copy;

  // Handle the 3 simple types, and null or undefined
  if (null === obj || 'object' !== typeof obj) {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array
  if (obj instanceof Array) {
    copy = [];
    for (var i = 0, len = obj.length; i < len; i++) {
      copy[i] = Utils.clone(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = Utils.clone(obj[attr]);
      }
    }
    return copy;
  }

  throw new Error('Unable to copy object! Its type is not supported.');
};


/**
 * Custom Event Target base class to allow listening and firing events.
 */
Utils.CustomEventTarget = function() {
  this._init();
};


/**
 * Initializes the custom event target.
 * @private
 */
Utils.CustomEventTarget.prototype._init = function() {
  this._registrations = {};
};


/**
 * Returns the listeners for the specific type.
 * @param  {string} type Event name.
 * @param  {boolean} useCapture
 * @return {Array.<function>} List of listeners.
 * @private
 */
Utils.CustomEventTarget.prototype._getListeners = function(type, useCapture) {
  var capType = (useCapture ? '1' : '0')+type;
  if (!(capType in this._registrations)) {
    this._registrations[capType] = [];
  }
  return this._registrations[capType];
};


/**
 * Adds event listener for object.
 * @param  {string} type Event name.
 * @param  {Function} listener Callback function.
 * @param  {boolean} useCapture
 */
Utils.CustomEventTarget.prototype.addEventListener = function(
    type, listener, useCapture) {
  var listeners = this._getListeners(type, useCapture);
  var ix = listeners.indexOf(listener);
  if (ix === -1) {
    listeners.push(listener);
  }
};


/**
 * Removes event listener for object.
 * @param  {string} type Event name.
 * @param  {Function} listener Callback function.
 * @param  {boolean} useCapture
 */
Utils.CustomEventTarget.prototype.removeEventListener = function(
    type, listener, useCapture) {
    var listeners = this._getListeners(type, useCapture);
    var ix = listeners.indexOf(listener);
    if (ix !== -1) {
      listeners.splice(ix, 1);
    }
};


/**
 * Dispatches the event
 * @param  {Event} event Event object.
 * @return {boolean} Whether the event has not been defaultPrevented.
 */
Utils.CustomEventTarget.prototype.dispatchEvent = function(event) {
  var listeners = this._getListeners(event.type, false).slice();
  for (var i= 0; i<listeners.length; i++) {
    listeners[i].call(this, event);
  }
  return !event.defaultPrevented;
};

},{}]},{},[5])(5)
});