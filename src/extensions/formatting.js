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
