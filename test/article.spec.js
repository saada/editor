var Article = require('../src/article');
var Selection = require('../src/selection');
var Paragraph = require('../src/paragraph');
var Section = require('../src/section');

describe('Article', function() {
  'use strict';

  var selection = Selection.getInstance();
  beforeEach(function() {
    spyOn(selection, 'updateWindowSelectionFromModel');
  });

  it('should expose Article constructor', function() {
    expect(Article).not.toBe(undefined);
  });

  it('should initialize Article with sections', function() {
    var section = new Section({
      paragraphs: [new Paragraph(), new Paragraph()]
    });

    var article = new Article({
      sections: [section]
    });

    expect(article.dom.nodeName).toBe('ARTICLE');
  });

  it('should return the json model', function() {
    var section = new Section({
      paragraphs: [new Paragraph({
        name: '12'
      })]
    });

    var article = new Article({
      sections: [section]
    });

    expect(article.getJSONModel()).toEqual({
      sections: [{
        paragraphs: [{
          text: '',
          name: '12',
          paragraphType: 'p'
        }]
      }]
    });

  });

  it('should insert section into article', function() {
    var article = new Article();
    article.insertSection(new Section());
    expect(article.sections.length).toBe(1);
    expect(article.sections[0].paragraphs.length).toBe(1);
  });

  it('should do a transaction', function() {
    var article = new Article();
    spyOn(article, 'do');
    article.transaction([{op: 'hello'}]);

    expect(article.history.length).toBe(1);
    expect(article.do).toHaveBeenCalled();
  });

  it('should call exec with do and undo', function() {
    var article = new Article();
    spyOn(article, 'exec');
    article.transaction([{op: 'hello'}]);

    expect(article.exec).toHaveBeenCalledWith({op: 'hello'}, 'do');
    expect(article.historyAt).toBe(1);

    article.undo();
    expect(article.exec).toHaveBeenCalledWith({op: 'hello'}, 'undo');
    expect(article.historyAt).toBe(0);
    article.exec.calls.reset();

    article.undo();
    expect(article.exec).not.toHaveBeenCalled();
    expect(article.historyAt).toBe(0);

    article.redo();
    expect(article.exec).toHaveBeenCalledWith({op: 'hello'}, 'do');
    expect(article.historyAt).toBe(1);

    article.exec.calls.reset();
    article.redo();
    expect(article.exec).not.toHaveBeenCalled();
    expect(article.historyAt).toBe(1);
  });

  it('should execute the proper operation', function() {
    var section = new Section({
      paragraphs: [new Paragraph()]
    });
    var article = new Article({
      sections: [section]
    });

    var op = {
      do: {
        op: 'insertParagraph',
        section: article.sections[0].name,
        paragraph: '1234',
        index: 1
      },
      undo: {
        op: 'deleteParagraph',
        paragraph: '1234',
      }
    };

    article.exec(op, 'do');
    expect(section.paragraphs.length).toBe(2);
    article.exec(op, 'undo');
    expect(section.paragraphs.length).toBe(1);

    op = {
      do: {
        op: 'updateParagraph',
        paragraph: section.paragraphs[0].name,
        value: 'Hello World',
        cursorOffset: 11
      },
      undo: {
        op: 'updateParagraph',
        paragraph: section.paragraphs[0].name,
        value: '',
        cursorOffset: 0
      }
    };

    article.exec(op, 'do');
    expect(section.paragraphs[0].text).toBe('Hello World');
    article.exec(op, 'undo');
    expect(section.paragraphs[0].text).toBe('');
  });

  it('should get section and paragraph by name', function() {
    var section = new Section({
      paragraphs: [new Paragraph()]
    });
    var article = new Article({
      sections: [section]
    });

    var sec = article.getSectionByName(section.name);
    expect(sec).toBe(section);

    var paragraph = article.getParagraphByName(section.paragraphs[0].name);
    expect(paragraph).toBe(section.paragraphs[0]);
  });
});
