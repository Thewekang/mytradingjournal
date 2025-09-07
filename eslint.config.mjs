import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

// Local inline plugin to block raw named colors & rgb()/hsl() usage outside token definitions
const namedColors = new Set([
  'aliceblue','antiquewhite','aqua','aquamarine','azure','beige','bisque','black','blanchedalmond','blue','blueviolet','brown','burlywood','cadetblue','chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkgrey','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','fuchsia','gainsboro','ghostwhite','gold','goldenrod','gray','green','greenyellow','grey','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender','lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen','lightgrey','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue','lightyellow','lime','limegreen','linen','magenta','maroon','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','navy','oldlace','olive','olivedrab','orange','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','purple','red','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','silver','skyblue','slateblue','slategray','slategrey','snow','springgreen','steelblue','tan','teal','thistle','tomato','turquoise','violet','wheat','white','whitesmoke','yellow','yellowgreen','rebeccapurple'
]);

function isAllowedFile(filename){
  return /app[\\/]+globals\.css$/.test(filename) || /tailwind\.config\.(?:[cm]?js)$/.test(filename);
}

const localPlugin = {
  rules: {
    'no-raw-colors': {
      meta: { type: 'problem', docs: { description: 'disallow raw CSS named colors and rgb()/hsl() color functions outside token definitions' }, schema: [] },
      create(context){
        const filename = context.getFilename();
        if (isAllowedFile(filename)) return {};
        function checkString(value, node){
          if (typeof value !== 'string') return;
          const v = value.trim().toLowerCase();
          if (!v) return;
          // Skip CSS variable usage
          if (v.startsWith('var(')) return;
          // Only flag if the ENTIRE literal is a raw color (avoid Tailwind utility class strings)
          if (namedColors.has(v)) {
            context.report({ node, message: `Raw named color '${value}' detected; define & use a CSS variable token instead.` });
            return;
          }
          // Pure color function (no extra tokens around it)
          if (/^(?:rgb|hsl)a?\([^)]*\)$/.test(v)) {
            context.report({ node, message: `Raw color function '${value}' detected; wrap in a token (CSS variable) defined in globals.css.` });
            return;
          }
          // Any other composite string (spaces, colon, dash, slash, brackets) is ignored to avoid utility class false positives.
          if (/[\s:/\[\]-]/.test(v)) return;
          // otherwise leave unflagged (hex caught by separate rule)
        }
        return {
          Literal(node){
            checkString(node.value, node);
          },
          TemplateLiteral(node){
            if (node.expressions.length === 0 && node.quasis.length === 1) {
              checkString(node.quasis[0].value.cooked, node);
            }
          }
        };
      }
    }
  }
};

export default [
  { ignores: ['.next/**','node_modules/**','dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks, local: localPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn','error'] }],
      '@next/next/no-html-link-for-pages': 'off',
  // Re-enabled as error after Phase 2 typing cleanup
  '@typescript-eslint/no-explicit-any': ['error'],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Simple regex guard discouraging raw hex colors in TSX (allow inline dynamic and variables)
      // This is a heuristic; future: migrate to custom plugin scanning style attributes.
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$/]",
          message: 'Use a design token (CSS var) instead of raw hex color.'
        }
      ],
  'local/no-raw-colors': 'error'
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node }
    }
  },
  // Allow console usage in scripts utilities
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' }
  }
];
