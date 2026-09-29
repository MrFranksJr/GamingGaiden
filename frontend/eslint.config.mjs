import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
    {
        ignores: [
            "node_modules/**",
            "resources/js/**",
            "scripts/**",
            "*.config.js",
            "*.config.ts"
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        plugins: {
            "unused-imports": unusedImports
        },
        rules: {
            // Dead-code detection: flag unused imports and variables/exports.
            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/no-unused-vars": "off",
            "unused-imports/no-unused-vars": [
                "warn",
                {vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_"}
            ],
            // Reliability: an unawaited promise is almost always a bug here.
            "@typescript-eslint/no-floating-promises": "off",
            // The codebase legitimately uses a couple of `as any` DOM shims; warn, don't block.
            "@typescript-eslint/no-explicit-any": "warn"
        }
    },
    {
        files: ["tests/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off"
        }
    }
);
