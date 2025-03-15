class ForceDirectedLayout {
    constructor() {
        this.options = {};
        this.nodes = [];
        this.edges = [];
        this.width = 800;
        this.height = 600;
        this.alpha = 1; // Current strength of the simulation
        this.iterations = 300; // Number of iterations for the simulation
    }

    init(cy) {
        this.cy = cy;
        this.nodes = cy.nodes().map((node, i) => {
            return {
                id: node.id(),
                index: i,
                x: node.position('x'),
                y: node.position('y'),
                vx: 0,
                vy: 0,
                node: node // Reference to the actual Cytoscape node
            };
        });
        
        this.edges = cy.edges().map((edge) => {
            return {
                source: this.nodes.findIndex(n => n.id === edge.source().id()),
                target: this.nodes.findIndex(n => n.id === edge.target().id()),
                edge: edge // Reference to the actual Cytoscape edge
            };
        });
        
        this.alpha = 1; // Reset alpha for a new layout run
    }

    run() {
        // Run the simulation for multiple iterations
        for (let i = 0; i < this.iterations && this.alpha > 0.001; i++) {
            this.applyLayout();
        }
        
        // Update the actual node positions in Cytoscape
        this.nodes.forEach(node => {
            node.node.position({
                x: node.x,
                y: node.y
            });
        });
    }

    applyLayout() {
        // Apply forces to nodes
        this.nodes.forEach(node => {
            node.vx = (Math.random() - 0.5) * this.alpha; 
            node.vy = (Math.random() - 0.5) * this.alpha;
        });

        this.edges.forEach(edge => {
            const source = this.nodes[edge.source];
            const target = this.nodes[edge.target];
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = (distance - 100) / distance * 0.1;

            // Apply force to source node
            source.vx += force * dx;
            source.vy += force * dy;

            // Apply force to target node
            target.vx -= force * dx;
            target.vy -= force * dy;
        });

        // Update node positions
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Constrain nodes within the bounds
            node.x = Math.max(0, Math.min(this.width, node.x));
            node.y = Math.max(0, Math.min(this.height, node.y));
        });

        // Reduce alpha to simulate damping
        this.alpha *= 0.99;
    }
}

// Make available in browser context
window.ForceDirectedLayout = ForceDirectedLayout;