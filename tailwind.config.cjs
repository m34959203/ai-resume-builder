/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(6deg)' },
          '50%': { transform: 'translateY(-20px) rotate(8deg)' },
        },
      },
      backgroundImage: {
        'mesh-gradient': "radial-gradient(at 0% 0%, hsla(225,100%,94%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,100%,99%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(225,100%,94%,1) 0, transparent 50%)",
      },
    },
  },
  plugins: [],
};
