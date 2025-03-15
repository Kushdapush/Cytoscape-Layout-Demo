class GridLayout {
    constructor() {
        this.options = {};
        this.cy = null;
    }

    init(cy) {
        this.cy = cy;
    }

    applyLayout() {
        const nodes = this.cy.nodes();
        const nodeCount = nodes.length;
        
        // Calculate grid dimensions
        const cols = Math.ceil(Math.sqrt(nodeCount));
        const rows = Math.ceil(nodeCount / cols);
        
        // Calculate cell size
        const cellWidth = this.cy.width() / (cols + 1);
        const cellHeight = this.cy.height() / (rows + 1);
        
        // Position nodes in a grid
        nodes.forEach((node, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const x = (col + 1) * cellWidth;
            const y = (row + 1) * cellHeight;
            
            node.position({
                x: x,
                y: y
            });
        });
        
        return this.cy.nodes().positions();
    }
}

// Make available in browser context
window.GridLayout = GridLayout;