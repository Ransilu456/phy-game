export class ThemeManager {
    constructor() {
        this.themes = ['win95'];
        this.currentTheme = 'win95';
        this.applyTheme(this.currentTheme);
    }

    init() {
        const selector = document.getElementById('theme-selector');
        if (selector) {
            selector.value = this.currentTheme;
            // Theme selection is disabled for now as we are full Win95
            selector.disabled = true;
        }
    }

    applyTheme(themeName) {
        document.documentElement.className = 'theme-win95';
        console.log(`Windows 95 Environment Activated.`);
    }
}
