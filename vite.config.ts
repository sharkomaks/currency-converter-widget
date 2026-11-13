import { defineConfig } from 'vite';

// Проход «esm плюс html» (план §15): одно окно у тулбара; настройки и
// онбординг — его виды, отдельных html больше нет. base "./" — расширение
// грузит файлы относительно корня, не с сервера.
export default defineConfig({
	base: './',
	publicDir: 'public',
	build: {
		outDir: 'dist/app',
		emptyOutDir: false, // dist/app чистит первый iife-проход, здесь он бы стёр content.js и background.js
		rollupOptions: {
			input: {
				popup: 'src/popup/popup.html'
			}
		}
	}
});
