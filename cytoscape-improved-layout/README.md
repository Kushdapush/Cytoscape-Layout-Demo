# Cytoscape Improved Layout

This project enhances the Cytoscape.js library by implementing various graph layout algorithms, including a force-directed layout, circular layout, and grid layout. These algorithms improve the placement of nodes in a graph, making it easier to visualize complex data structures.

## Features

- **Force-Directed Layout**: Utilizes physics-based simulation to position nodes based on attractive and repulsive forces, resulting in a natural and aesthetically pleasing arrangement.
- **Circular Layout**: Arranges nodes in a circular pattern, which can be useful for visualizing relationships in a radial format.
- **Grid Layout**: Organizes nodes in a structured grid format, making it easy to view and analyze data in a systematic way.

## Installation

To install the project, clone the repository and run the following command:

```
npm install
```

## Usage

To use the improved layout algorithms, import the desired layout class from the `src/layouts` directory and apply it to your Cytoscape.js instance. Here’s a basic example:

```javascript
import cytoscape from 'cytoscape';
import ForceDirectedLayout from './layouts/force-directed';

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [ /* your graph elements */ ],
});

const layout = new ForceDirectedLayout(cy);
layout.init();
layout.run();
```

## Demo

A demo of the improved layout algorithms is available in the `demo` directory. Open `demo/index.html` in your browser to see the layouts in action.

## Testing

Unit tests for the layout algorithms are located in the `test/layout-tests.js` file. To run the tests, use the following command:

```
npm test
```

## License

This project is licensed under the MIT License. See the LICENSE file for more details.