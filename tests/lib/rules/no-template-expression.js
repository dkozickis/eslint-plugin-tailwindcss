/**
 * @fileoverview Forbid using arbitrary values in classnames
 * @author François Massart
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../../../lib/rules/no-template-expression");
var RuleTester = require("eslint").RuleTester;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var parserOptions = {
  ecmaVersion: 2019,
  sourceType: "module",
  ecmaFeatures: {
    jsx: true,
  },
};

var generateErrors = (expressions) => {
  const errors = [];
  if (typeof expressions === "string") {
    expressions = expressions.split(" ");
  }
  expressions.map(() => {
    errors.push({
      messageId: "templateExpressionDetected",
    });
  });
  return errors;
};

var ruleTester = new RuleTester({ parserOptions });

ruleTester.run("no-template-expression", rule, {
  valid: [
    {
      code: `<div class="flex shrink-0 flex-col">No arbitrary value</div>`,
    },
  ],

  invalid: [
    {
      code: "<div class={`w-${dada}`}>Template literal!</div>",
      errors: generateErrors("dada"),
    },
    {
      code: "<div class={`bg-${bg} text-${text}`}>Arbitrary values!</div>",
      errors: generateErrors("bg text"),
    },
    {
      code: "ctl(`\
        text-${text}\
        container\
        flex\
        bg-${bg}\
        w-12\
        sm:w-6\
        lg:w-4\
      `)",
      errors: generateErrors("text bg"),
    },
    {
      code: "\
      <nav\
        className={cns(\"flex relative flex-row rounded-lg select-none\", {\
          \"bg-gray-200 p-1\": !size,\
          [\`h-${width}\`]: size === \"sm\",\
        })}\
      />",
      options: [
        {
          callees: ["cns"],
        },
      ],
      errors: generateErrors("width"),
    },
    {
      code: "\
      classnames(\
        [\`flex text-${text}\`],\
        myFlag && [\
          \`w-${width}\`,\
          someBoolean ? [\`bg-${bg}\`] : { [\`h-${width}\`]: someOtherFlag },\
        ]\
      );",
      errors: generateErrors("text width bg width"),
    },
  ],
});
