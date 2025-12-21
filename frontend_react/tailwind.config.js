/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#00d9ff',
                secondary: '#ff00ff',
            },
            fontFamily: {
                mono: ['Segoe UI', 'Roboto', 'monospace']
            }
        },
    },
    plugins: [],
}
