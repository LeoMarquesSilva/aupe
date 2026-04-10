/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0a0f2d',
        'orange-action': '#f74211',
        'orange-light': '#ff6b42',
        'orange-dark': '#d4380d',
        'grayish-blue': '#525663',
        'medium-blue': '#3e54b5',
        'light-blue': '#bbc9f9',
        'off-white': '#f6f6f6',
      },
      fontFamily: {
        heading: ['"Cabinet Grotesk"', 'sans-serif'],
        body: ['"Poppins"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
      },
      backgroundImage: {
        'gradient-action': 'var(--gradient-01)',
        'gradient-depth': 'var(--gradient-02)',
      },
    },
  },
  plugins: [],
};
