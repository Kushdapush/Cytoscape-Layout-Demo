const ForceDirectedLayout = require('./layouts/force-directed');
const CircularLayout = require('./layouts/circular');
const GridLayout = require('./layouts/grid');

// Register the extension on a cytoscape lib ref
const register = function(cytoscape) {
    if (!cytoscape) { return; } // Can't register if cytoscape unspecified
    
    // Register the improved layout algorithms
    cytoscape('layout', 'force-directed-improved', function(opts) {
        const cy = this;
        const layout = new ForceDirectedLayout();
        layout.init(cy);
        return layout;
    });
    
    cytoscape('layout', 'circular-improved', function(opts) {
        const cy = this;
        const layout = new CircularLayout();
        layout.init(cy);
        return layout;
    });
    
    cytoscape('layout', 'grid-improved', function(opts) {
        const cy = this;
        const layout = new GridLayout();
        layout.init(cy);
        return layout;
    });
};

// Auto-register if Cytoscape is loaded
if (typeof cytoscape !== 'undefined') {
    register(cytoscape);
}

module.exports = register;