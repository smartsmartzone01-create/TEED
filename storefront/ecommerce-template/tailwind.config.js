/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',     // All templates in templates/ and subfolders
    './**/*.html',               // Optional: all HTML files in project
    './static/js/**/*.js',       // Optional: if you're using Tailwind classes in JS
  ],
  theme: {
    extend: {
      colors: {
        primary: '#c56926',
      },
    },
  },
  plugins: [],
};

