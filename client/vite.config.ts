import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import { createFontSubsetter } from "./lib/web-components/Icon/subsetter_plugin"
import { IconCharacters } from "./src/components/Icon/icons_chars"

export default defineConfig({
    plugins: [
        solid(),
        createFontSubsetter(
            IconCharacters.join(""),
            "material-symbols",
            "./public/fonts/material_symbols_rounded/MaterialSymbolsRounded.ttf",
            "./public/fonts/MaterialSymbolsOptimized.woff2"
        )
    ],
})
