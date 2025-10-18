import type { Config } from 'tailwindcss';
const defaultTheme = require('tailwindcss/defaultTheme');

const config: Config = {
  // 🎯 هذا هو السطر الحاسم
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // يمكنك إزالة هذا الجزء مؤقتاً إذا لم تكمل إعداد الخطوط بعد
        sans: ['var(--font-cairo)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};

export default config;