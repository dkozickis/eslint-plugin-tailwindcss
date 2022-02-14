/**
 * @fileoverview Forbid using template expressions in classnames
 * @author Deniss Kozickis
 */
'use strict';

const docsUrl = require('../util/docsUrl');
const astUtil = require('../util/ast');
const getOption = require('../util/settings');
const parserUtil = require('../util/parser');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

// Predefine message for use in context.report conditional.
// messageId will still be usable in tests.
const TEMPLATE_EXPRESSION_DETECTED_MSG = `Template expression detected`;

module.exports = {
  meta: {
    docs: {
      description: 'Forbid using template expressions in classnames',
      category: 'Best Practices',
      recommended: false,
      url: docsUrl('no-template-expression'),
    },
    messages: {
      templateExpressionDetected: TEMPLATE_EXPRESSION_DETECTED_MSG,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          callees: {
            type: 'array',
            items: { type: 'string', minLength: 0 },
            uniqueItems: true,
          },
          config: {
            default: 'tailwind.config.js',
            type: ['string', 'object'],
          },
          tags: {
            type: 'array',
            items: { type: 'string', minLength: 0 },
            uniqueItems: true,
          },
        },
      },
    ],
  },

  create: function (context) {
    const callees = getOption(context, 'callees');
    const tags = getOption(context, 'tags');


    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------


    /**
     * Recursive function crawling into child nodes
     * @param {ASTNode} node The root node of the current parsing
     * @returns {void}
     */
    const parseForTemplateLiterals = (node) => {
      let originalClassNamesValue = null;
      let trim = false;

      switch (node.type) {
        case 'TemplateLiteral':
          if (node.expressions.length === 0) {
            return;
          }

          node.expressions.forEach((exp) => {
            context.report({
              node: exp,
              messageId: 'templateExpressionDetected',
            });
          })

          return;
        case "JSXExpressionContainer":
          parseForTemplateLiterals(node.expression);
          return;
        case 'ConditionalExpression':
          parseForTemplateLiterals(node.consequent);
          parseForTemplateLiterals(node.alternate);
          return;
        case 'LogicalExpression':
          parseForTemplateLiterals(node.right);
          return;
        case 'ArrayExpression':
          node.elements.forEach((el) => {
            parseForTemplateLiterals(el);
          });
          return;
        case 'ObjectExpression':
          node.properties.forEach((prop) => {
            parseForTemplateLiterals(prop.key);
          });
          return;
        case 'Literal':
          trim = true;
          originalClassNamesValue = node.value;
          break;
        case 'TemplateElement':
          originalClassNamesValue = node.value.raw;
          break;
      }
    };

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    const attributeVisitor = function (node) {
      if (!astUtil.isClassAttribute(node)) {
        return;
      }

      if (astUtil.isLiteralAttributeValue(node)) {
        return;
      }

      parseForTemplateLiterals(node.value);
    };

    const scriptVisitor = {
      JSXAttribute: attributeVisitor,
      TextAttribute: attributeVisitor,
      CallExpression: function (node) {
        if (callees.findIndex((name) => node.callee.name === name) === -1) {
          return;
        }
        node.arguments.forEach((arg) => {
          parseForTemplateLiterals(arg);
        });
      },
      TaggedTemplateExpression: function (node) {
        if (!tags.includes(node.tag.name)) {
          return;
        }
        parseForTemplateLiterals(node.quasi);
      },
    };

    const templateVisitor = {
      VAttribute: function (node) {
        if (!astUtil.isValidVueAttribute(node)) {
          return;
        }
        parseForTemplateLiterals(node);
      },
    };

    return parserUtil.defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor);
  },
};
