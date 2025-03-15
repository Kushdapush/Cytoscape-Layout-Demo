class ForceDirectedLayout {
    constructor() {
        this.options = {};
        this.nodes = [];
        this.edges = [];
        this.width = 800;
        this.height = 600;
        this.alpha = 1; // Current strength of the simulation
        this.iterations = 300; // Number of iterations for the simulation
        this.idealEdgeLength = 100; // Ideal distance between connected nodes
        this.springStrength = 0.1; // Strength of edge springs
        this.repulsionStrength = 500; // Strength of node repulsion
        this.dampingFactor = 0.99; // Reduces forces over time for stabilization
        this.animationDuration = 500; // Duration for node position animations in ms
        this.animationEasing = 'ease-out'; // Easing function for animations
        this.isAnimating = false; // Flag to track if animation is in progress
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
                mass: node.data('mass') || 1, // Optional mass property
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
        
        // Set dimensions based on container
        this.width = cy.width();
        this.height = cy.height();
    }

    run() {
        // Run the simulation for multiple iterations
        for (let i = 0; i < this.iterations && this.alpha > 0.001; i++) {
            this.applyLayout();
        }
        
        // Update the actual node positions in Cytoscape with animation
        this.updateNodePositions(true);
    }

    applyLayout() {
        // Reset forces for this iteration
        this.nodes.forEach(node => {
            node.vx = 0; 
            node.vy = 0;
        });

        // Apply attractive forces along edges (spring forces)
        this.edges.forEach(edge => {
            const source = this.nodes[edge.source];
            const target = this.nodes[edge.target];
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1; // Avoid division by zero
            
            // Spring force: proportional to distance from ideal length
            const force = this.springStrength * (distance - this.idealEdgeLength) / distance;

            // Apply force to both nodes, scaled by their mass
            source.vx += force * dx / source.mass;
            source.vy += force * dy / source.mass;
            target.vx -= force * dx / target.mass;
            target.vy -= force * dy / target.mass;
        });

        // Apply repulsive forces between all pairs of nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeA = this.nodes[i];
                const nodeB = this.nodes[j];
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distanceSquared = dx * dx + dy * dy || 0.1; // Avoid division by zero
                const distance = Math.sqrt(distanceSquared);
                
                // Repulsive force: inversely proportional to square of distance
                const force = this.repulsionStrength / distanceSquared;
                
                // Apply force to both nodes, scaled by their mass
                nodeA.vx -= force * dx / distance / nodeA.mass;
                nodeA.vy -= force * dy / distance / nodeA.mass;
                nodeB.vx += force * dx / distance / nodeB.mass;
                nodeB.vy += force * dy / distance / nodeB.mass;
            }
        }

        // Update node positions
        this.nodes.forEach(node => {
            // Apply velocity with alpha as damping
            node.x += node.vx * this.alpha;
            node.y += node.vy * this.alpha;

            // Constrain nodes within the bounds with a bit of padding
            const padding = 20;
            node.x = Math.max(padding, Math.min(this.width - padding, node.x));
            node.y = Math.max(padding, Math.min(this.height - padding, node.y));
        });

        // Reduce alpha to simulate damping
        this.alpha *= this.dampingFactor;
    }
    
    // Update node positions in Cytoscape with optional animation
    updateNodePositions(animate = false) {
        if (animate && !this.isAnimating) {
            this.isAnimating = true;
            
            // Create animation promises
            const animations = this.nodes.map(node => {
                return new Promise(resolve => {
                    node.node.animate({
                        position: { x: node.x, y: node.y },
                        duration: this.animationDuration,
                        easing: this.animationEasing,
                        complete: resolve
                    });
                });
            });
            
            // Mark animation as complete when all nodes finish
            Promise.all(animations).then(() => {
                this.isAnimating = false;
            });
        } else {
            // Update positions immediately
            this.nodes.forEach(node => {
                node.node.position({ x: node.x, y: node.y });
            });
        }
    }

    // Add a new method to handle dynamic node addition with smoother transitions
    addNode(nodeData, connectedToIds = []) {
        // Create a new Cytoscape node
        const newCyNode = this.cy.add({
            group: 'nodes',
            data: nodeData
        });
        
        // Find a good initial position based on connected nodes
        let initialX = this.width / 2;
        let initialY = this.height / 2;
        
        if (connectedToIds.length > 0) {
            // Calculate the average position of connected nodes
            let sumX = 0, sumY = 0;
            let connectedCount = 0;
            
            connectedToIds.forEach(id => {
                const connectedNode = this.nodes.find(n => n.id === id);
                if (connectedNode) {
                    sumX += connectedNode.x;
                    sumY += connectedNode.y;
                    connectedCount++;
                }
            });
            
            if (connectedCount > 0) {
                initialX = sumX / connectedCount;
                initialY = sumY / connectedCount;
                
                // Add a small offset to avoid overlapping
                const offset = this.idealEdgeLength * 0.5;
                initialX += (Math.random() - 0.5) * offset;
                initialY += (Math.random() - 0.5) * offset;
            }
        } else {
            // If no connections, place randomly within the boundaries
            const padding = 50;
            initialX = padding + Math.random() * (this.width - 2 * padding);
            initialY = padding + Math.random() * (this.height - 2 * padding);
        }
        
        // Set the initial node position
        newCyNode.position({
            x: initialX,
            y: initialY
        });
        
        // Add the node to our internal data structures
        const newNodeIndex = this.nodes.length;
        const newNode = {
            id: nodeData.id,
            index: newNodeIndex,
            x: initialX,
            y: initialY,
            vx: 0,
            vy: 0,
            mass: nodeData.mass || 1,
            node: newCyNode
        };
        
        this.nodes.push(newNode);
        
        // Create edges to connected nodes
        const newEdges = [];
        connectedToIds.forEach(targetId => {
            const targetIndex = this.nodes.findIndex(n => n.id === targetId);
            if (targetIndex >= 0) {
                // Create Cytoscape edge
                const newCyEdge = this.cy.add({
                    group: 'edges',
                    data: {
                        source: nodeData.id,
                        target: targetId
                    }
                });
                
                // Add to our internal edges array
                const newEdge = {
                    source: newNodeIndex,
                    target: targetIndex,
                    edge: newCyEdge
                };
                
                this.edges.push(newEdge);
                newEdges.push(newEdge);
            }
        });
        
        // Run a partial simulation with progressive animations
        this.animateNewNodeIntegration(newNode, newEdges);
        
        return newCyNode;
    }
    
    // Animate the integration of a new node into the layout
    animateNewNodeIntegration(newNode, newEdges) {
        // Set alpha to a moderate value for incremental updates
        this.alpha = 0.3;
        
        // Number of animation frames
        const frames = 30;
        const frameDelay = 16; // ~60fps
        
        // Store initial positions of all nodes for animation
        const initialPositions = this.nodes.map(node => ({
            x: node.x,
            y: node.y
        }));
        
        // Run multiple iterations of the algorithm
        for (let i = 0; i < 50; i++) {
            this.applyLayout();
        }
        
        // Store final positions
        const finalPositions = this.nodes.map(node => ({
            x: node.x,
            y: node.y
        }));
        
        // Reset nodes to initial positions for animation
        this.nodes.forEach((node, i) => {
            node.x = initialPositions[i].x;
            node.y = initialPositions[i].y;
        });
        
        // Animate between initial and final positions
        let frame = 0;
        
        const animateFrame = () => {
            // Calculate progress (0 to 1)
            const progress = frame / frames;
            const easedProgress = this.easeInOutCubic(progress);
            
            // Interpolate positions
            this.nodes.forEach((node, i) => {
                const initialPos = initialPositions[i];
                const finalPos = finalPositions[i];
                
                node.x = initialPos.x + (finalPos.x - initialPos.x) * easedProgress;
                node.y = initialPos.y + (finalPos.y - initialPos.y) * easedProgress;
            });
            
            // Update positions in Cytoscape
            this.nodes.forEach(node => {
                node.node.position({
                    x: node.x,
                    y: node.y
                });
            });
            
            // Continue animation
            frame++;
            if (frame <= frames) {
                requestAnimationFrame(animateFrame);
            }
        };
        
        // Start animation
        requestAnimationFrame(animateFrame);
    }
    
    // Easing function for smoother animation
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Find optimal position for a new node based on its connections
    findOptimalPosition(connectedNodeIds) {
        // If no connected nodes, return a position in the center
        if (connectedNodeIds.length === 0) {
            return { x: this.width / 2, y: this.height / 2 };
        }
        
        // If connected to one node, place at an offset
        if (connectedNodeIds.length === 1) {
            const connectedNode = this.nodes.find(n => n.id === connectedNodeIds[0]);
            if (connectedNode) {
                // Find the least crowded direction around this node
                const angle = Math.random() * 2 * Math.PI;
                return {
                    x: connectedNode.x + Math.cos(angle) * this.idealEdgeLength,
                    y: connectedNode.y + Math.sin(angle) * this.idealEdgeLength
                };
            }
        }
        
        // If connected to multiple nodes, find the centroid
        let sumX = 0, sumY = 0;
        let count = 0;
        
        connectedNodeIds.forEach(id => {
            const node = this.nodes.find(n => n.id === id);
            if (node) {
                sumX += node.x;
                sumY += node.y;
                count++;
            }
        });
        
        if (count > 0) {
            // Add a small random offset to avoid overlapping
            const offset = this.idealEdgeLength * 0.5;
            return {
                x: sumX / count + (Math.random() - 0.5) * offset,
                y: sumY / count + (Math.random() - 0.5) * offset
            };
        }
        
        // Fallback
        return { x: this.width / 2, y: this.height / 2 };
    }
}

// Make available in browser context
if (typeof window !== 'undefined') {
    window.ForceDirectedLayout = ForceDirectedLayout;
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceDirectedLayout;
}