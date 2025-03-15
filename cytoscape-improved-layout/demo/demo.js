document.addEventListener('DOMContentLoaded', () => {
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
                    'label': 'data(id)'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'curve-style': 'bezier'
                }
            }
        ],

        layout: {
            name: 'grid',
            rows: 3
        }
    });

    const forceDirectedLayout = new ForceDirectedLayout();
    const circularLayout = new CircularLayout();
    const gridLayout = new GridLayout();

    document.getElementById('force-directed').addEventListener('click', () => {
        forceDirectedLayout.init(cy);
        forceDirectedLayout.run();
    });

    document.getElementById('circular').addEventListener('click', () => {
        circularLayout.init(cy);
        circularLayout.applyLayout();
    });

    document.getElementById('grid').addEventListener('click', () => {
        gridLayout.init(cy);
        gridLayout.applyLayout();
    });
});