// Update demo/demo.js to add node addition functionality
document.addEventListener('DOMContentLoaded', () => {
    // Create layout instances
    const forceDirectedLayout = new ForceDirectedLayout();
    const circularLayout = new CircularLayout();
    const gridLayout = new GridLayout();

    const cy = cytoscape({
        container: document.getElementById('cy'), 

        elements: [ 
            { data: { id: 'a' } },
            { data: { id: 'b' } },
            { data: { id: 'c' } },
            { data: { id: 'd' } },
            { data: { id: 'e' } },
            { data: { id: 'f' } },
            { data: { id: 'g' } },
            { data: { id: 'h' } },
            { data: { id: 'i' } },
            { data: { id: 'j' } },
            { data: { id: 'k' } },
            { data: { id: 'l' } },
            { data: { id: 'm' } },
            { data: { id: 'n' } },
            { data: { id: 'o' } },
            { data: { id: 'p' } },
            { data: { id: 'q' } },
            { data: { id: 'r' } },
            { data: { id: 's' } },
            { data: { id: 't' } },

            // Add some edges for the force-directed layout to work with
            { data: { source: 'a', target: 'b' } },
            { data: { source: 'b', target: 'c' } },
            { data: { source: 'c', target: 'd' } },
            { data: { source: 'd', target: 'e' } },
            { data: { source: 'e', target: 'f' } },
            { data: { source: 'f', target: 'a' } },
            { data: { source: 'g', target: 'h' } },
            { data: { source: 'h', target: 'i' } },
            { data: { source: 'i', target: 'j' } },
            { data: { source: 'j', target: 'g' } },
            { data: { source: 'k', target: 'l' } },
            { data: { source: 'l', target: 'm' } },
            { data: { source: 'm', target: 'k' } },
        ],

        style: [ 
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'label': 'data(id)',
                    'text-outline-width': 2,
                    'text-outline-color': '#fff',
                    'color': '#000'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle'
                }
            },
            {
                selector: 'node.new',
                style: {
                    'background-color': '#e74c3c',
                    'border-width': 3,
                    'border-color': '#c0392b',
                    'label': 'data(id)'
                }
            },
            {
                selector: 'edge.new',
                style: {
                    'line-color': '#e74c3c',
                    'width': 4
                }
            }
        ],

        layout: {
            name: 'grid',
            rows: 3
        }
    });

    // Initialize layouts with Cytoscape instance
    let activeLayout = null;

    document.getElementById('force-directed').addEventListener('click', () => {
        activeLayout = forceDirectedLayout;
        forceDirectedLayout.init(cy);
        forceDirectedLayout.run();
    });

    document.getElementById('circular').addEventListener('click', () => {
        activeLayout = circularLayout;
        circularLayout.init(cy);
        circularLayout.applyLayout();
    });

    document.getElementById('grid').addEventListener('click', () => {
        activeLayout = gridLayout;
        gridLayout.init(cy);
        gridLayout.applyLayout();
    });
    
    // Add event listener for adding new nodes
    document.getElementById('add-node').addEventListener('click', () => {
        // Use force-directed layout for adding nodes
        if (activeLayout !== forceDirectedLayout) {
            forceDirectedLayout.init(cy);
            activeLayout = forceDirectedLayout;
        }
        
        // Initialize the layout if not already done
        if (forceDirectedLayout.nodes.length === 0) {
            forceDirectedLayout.init(cy);
        }
        
        // Generate a new unique node ID with a prefix and timestamp for uniqueness
        const newNodeId = 'node-' + Date.now().toString().slice(-6);
        
        // Select random existing nodes to connect to (1-3 connections)
        const existingNodes = cy.nodes().map(n => n.id());
        const numConnections = Math.floor(Math.random() * 3) + 1;
        const connectToIds = [];
        
        for (let i = 0; i < numConnections && existingNodes.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * existingNodes.length);
            connectToIds.push(existingNodes[randomIndex]);
            existingNodes.splice(randomIndex, 1); // Remove to avoid duplicate connections
        }
        
        // Add the new node using our enhanced method
        const newNode = forceDirectedLayout.addNode({ id: newNodeId }, connectToIds);
        
        // Highlight the new node
        newNode.addClass('new');
        
        // Highlight the new edges
        connectToIds.forEach(targetId => {
            cy.edges(`[source = "${newNodeId}"][target = "${targetId}"], [source = "${targetId}"][target = "${newNodeId}"]`).addClass('new');
        });
        
        // After a few seconds, remove the highlighting
        setTimeout(() => {
            newNode.removeClass('new');
            cy.edges('.new').removeClass('new');
        }, 3000);
    });

    // Initialize with force-directed layout
    forceDirectedLayout.init(cy);
    activeLayout = forceDirectedLayout;
    
    // Add listener for window resize to adjust layouts
    window.addEventListener('resize', () => {
        if (activeLayout) {
            activeLayout.init(cy);
            if (activeLayout === forceDirectedLayout) {
                activeLayout.run();
            } else {
                activeLayout.applyLayout();
            }
        }
    });
});