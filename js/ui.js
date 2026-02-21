export class ComponentLoader {
    static async load(componentName, containerId) {
        try {
            const response = await fetch(`components/${componentName}.html`);
            if (!response.ok) throw new Error(`Failed to load component: ${componentName}`);
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    static async loadAll() {
        const containers = {
            'header-container': 'header',
            'simulation-container': 'simulation',
            'controls-panel-container': 'controls',
            'learning-hub-container': 'learning_hub'
        };

        for (const [id, comp] of Object.entries(containers)) {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`Container not found: ${id}`);
                continue;
            }
            await this.load(comp, id);
        }
        console.log("All components loaded.");
    }
}
