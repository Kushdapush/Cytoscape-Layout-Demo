class CircularLayout {
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
        const radius = Math.min(this.cy.width(), this.cy.height()) * 0.4;
        const centerX = this.cy.width() / 2;
        const centerY = this.cy.height() / 2;
        
        // Position nodes in a circle
        nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / nodeCount;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            node.position({
                x: x,
                y: y
            });
        });
        
        return this.cy.nodes().positions();
    }
}

// Make available in browser context
window.CircularLayout = CircularLayout;