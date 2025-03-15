const { ForceDirectedLayout } = require('../src/layouts/force-directed');
const { CircularLayout } = require('../src/layouts/circular');
const { GridLayout } = require('../src/layouts/grid');

describe('Layout Algorithms', () => {
    let cy;

    beforeEach(() => {
        cy = { nodes: jest.fn(), layout: jest.fn() }; // Mock Cytoscape instance
    });

    test('Force Directed Layout', () => {
        const layout = new ForceDirectedLayout(cy);
        layout.init();
        layout.run();
        const positions = layout.applyLayout();
        
        expect(positions).toBeDefined();
        expect(typeof positions).toBe('object');
    });

    test('Circular Layout', () => {
        const layout = new CircularLayout(cy);
        layout.init();
        const positions = layout.applyLayout();
        
        expect(positions).toBeDefined();
        expect(typeof positions).toBe('object');
    });

    test('Grid Layout', () => {
        const layout = new GridLayout(cy);
        layout.init();
        const positions = layout.applyLayout();
        
        expect(positions).toBeDefined();
        expect(typeof positions).toBe('object');
    });
});