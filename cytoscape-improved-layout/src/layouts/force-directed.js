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
        this.minEdgeDistance = 50; // Minimum distance between edges
        this.edgeRepulsionStrength = 200; // Strength of edge-edge repulsion
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
                node: node, // Reference to the actual Cytoscape node
                width: node.width() || 50, // Node width for collision detection
                height: node.height() || 50 // Node height for collision detection
            };
        });
        
        this.edges = cy.edges().map((edge) => {
            return {
                source: this.nodes.findIndex(n => n.id === edge.source().id()),
                target: this.nodes.findIndex(n => n.id === edge.target().id()),
                edge: edge, // Reference to the actual Cytoscape edge
                weight: edge.data('weight') || 1 // Optional weight property
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
                
                // Enhanced repulsive force between nodes
                // Increase repulsion when nodes get too close to ensure minimum distance
                const effectiveDistance = Math.max(distance, nodeA.width/2 + nodeB.width/2 + this.minEdgeDistance);
                const nodeRepulsionFactor = this.repulsionStrength / (effectiveDistance * effectiveDistance);
                
                // Calculate repulsion direction
                const forceX = dx / distance * nodeRepulsionFactor;
                const forceY = dy / distance * nodeRepulsionFactor;
                
                // Apply force to both nodes, scaled by their mass
                nodeA.vx -= forceX / nodeA.mass;
                nodeA.vy -= forceY / nodeA.mass;
                nodeB.vx += forceX / nodeB.mass;
                nodeB.vy += forceY / nodeB.mass;
            }
        }
        
        // Apply edge-edge repulsion to prevent edge overlaps
        this.applyEdgeRepulsion();

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
    
    // New method to calculate and apply edge-edge repulsion
    applyEdgeRepulsion() {
        // For each pair of edges, calculate if they are too close and apply repulsion
        for (let i = 0; i < this.edges.length; i++) {
            for (let j = i + 1; j < this.edges.length; j++) {
                const edgeA = this.edges[i];
                const edgeB = this.edges[j];
                
                // Skip if edges share a node (they will naturally have a close point)
                if (edgeA.source === edgeB.source || edgeA.source === edgeB.target || 
                    edgeA.target === edgeB.source || edgeA.target === edgeB.target) {
                    continue;
                }
                
                // Get edge line segments
                const sourceA = this.nodes[edgeA.source];
                const targetA = this.nodes[edgeA.target];
                const sourceB = this.nodes[edgeB.source];
                const targetB = this.nodes[edgeB.target];
                
                // Find closest points between the two edges
                const closestPoints = this.closestPointsBetweenSegments(
                    sourceA.x, sourceA.y, targetA.x, targetA.y,
                    sourceB.x, sourceB.y, targetB.x, targetB.y
                );
                
                if (!closestPoints) continue;
                
                const { point1, point2, distance } = closestPoints;
                
                // If edges are too close, apply repulsive forces to their nodes
                if (distance < this.minEdgeDistance) {
                    // Calculate repulsion direction
                    const dx = point2.x - point1.x;
                    const dy = point2.y - point1.y;
                    const magnitude = Math.sqrt(dx * dx + dy * dy) || 0.1;
                    
                    // Calculate repulsion strength (stronger when closer)
                    const edgeRepulsionFactor = this.edgeRepulsionStrength * 
                        (this.minEdgeDistance - distance) / this.minEdgeDistance;
                    
                    // Calculate normalized force components
                    const forceX = dx / magnitude * edgeRepulsionFactor;
                    const forceY = dy / magnitude * edgeRepulsionFactor;
                    
                    // Apply forces to the nodes of both edges (distribute force among endpoints)
                    // First edge nodes move away from second edge
                    sourceA.vx -= forceX * 0.5;
                    sourceA.vy -= forceY * 0.5;
                    targetA.vx -= forceX * 0.5;
                    targetA.vy -= forceY * 0.5;
                    
                    // Second edge nodes move in opposite direction
                    sourceB.vx += forceX * 0.5;
                    sourceB.vy += forceY * 0.5;
                    targetB.vx += forceX * 0.5;
                    targetB.vy += forceY * 0.5;
                }
            }
        }
    }
    
    // Helper method to find closest points between two line segments
    closestPointsBetweenSegments(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Line segment 1: (x1, y1) to (x2, y2)
        // Line segment 2: (x3, y3) to (x4, y4)
        
        // Direction vectors
        const dx1 = x2 - x1;
        const dy1 = y2 - y1;
        const dx2 = x4 - x3;
        const dy2 = y4 - y3;
        
        // Segment lengths squared
        const len1Squared = dx1 * dx1 + dy1 * dy1;
        const len2Squared = dx2 * dx2 + dy2 * dy2;
        
        // If either segment is actually a point, use point-to-segment distance
        if (len1Squared < 0.0001 || len2Squared < 0.0001) {
            // Use simple point-to-point distance instead
            const distance = Math.sqrt((x1 - x3) * (x1 - x3) + (y1 - y3) * (y1 - y3));
            return {
                point1: { x: x1, y: y1 },
                point2: { x: x3, y: y3 },
                distance: distance
            };
        }
        
        // Cross product of the two direction vectors
        const cross = dx1 * dy2 - dy1 * dx2;
        
        // If lines are parallel (or close to it)
        if (Math.abs(cross) < 0.0001) {
            // Use the closest endpoint method
            let minDist = Number.MAX_VALUE;
            let p1 = null, p2 = null;
            
            // Test all endpoint combinations
            const testPoints = [
                { p1: { x: x1, y: y1 }, p2: { x: x3, y: y3 } },
                { p1: { x: x1, y: y1 }, p2: { x: x4, y: y4 } },
                { p1: { x: x2, y: y2 }, p2: { x: x3, y: y3 } },
                { p1: { x: x2, y: y2 }, p2: { x: x4, y: y4 } }
            ];
            
            for (const { p1: point1, p2: point2 } of testPoints) {
                const d = Math.sqrt((point1.x - point2.x) * (point1.x - point2.x) + 
                                    (point1.y - point2.y) * (point1.y - point2.y));
                if (d < minDist) {
                    minDist = d;
                    p1 = point1;
                    p2 = point2;
                }
            }
            
            return { point1: p1, point2: p2, distance: minDist };
        }
        
        // Calculate parameters for the closest points
        const dx3 = x1 - x3;
        const dy3 = y1 - y3;
        
        const t1 = (dx3 * dy2 - dy3 * dx2) / cross;
        const t2 = (dx3 * dy1 - dy3 * dx1) / cross;
        
        // Check if closest points are within segments
        const t1Clamped = Math.max(0, Math.min(1, t1));
        const t2Clamped = Math.max(0, Math.min(1, t2));
        
        // Calculate closest points
        const point1 = {
            x: x1 + t1Clamped * dx1,
            y: y1 + t1Clamped * dy1
        };
        
        const point2 = {
            x: x3 + t2Clamped * dx2,
            y: y3 + t2Clamped * dy2
        };
        
        // Calculate distance between closest points
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return { point1, point2, distance };
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
                const offset = this.idealEdgeLength * 0.75; // Increased offset for better spacing
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
            node: newCyNode,
            width: newCyNode.width() || 50,
            height: newCyNode.height() || 50
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
                    edge: newCyEdge,
                    weight: 1
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
        
        // Run multiple iterations of the algorithm, with more iterations for better edge spacing
        for (let i = 0; i < 75; i++) {
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
            const offset = this.idealEdgeLength * 0.75;
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