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
        // All nodes from the initial layout are marked as anchored (isNew=false)
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
                height: node.height() || 50, // Node height for collision detection
                isNew: false // Pre-existing nodes are anchored
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
        this.width = cy.width();
        this.height = cy.height();
    }

    run() {
        // Run simulation iterations until convergence
        for (let i = 0; i < this.iterations && this.alpha > 0.001; i++) {
            this.applyLayout();
        }
        
        // Update the actual node positions in Cytoscape with animation
        this.updateNodePositions(true);

        // After simulation, mark any new nodes as anchored so they don’t move further.
        this.nodes.forEach(node => {
            if (node.isNew) {
                node.isNew = false;
            }
        });
    }

    applyLayout() {
        // Reset forces only for new nodes.
        this.nodes.forEach(node => {
            if (node.isNew) {
                node.vx = 0;
                node.vy = 0;
            }
        });

        // Apply attractive (spring) forces along edges.
        // Only update forces for new nodes when the edge connects an anchored node to a new node,
        // or when both endpoints are new.
        this.edges.forEach(edge => {
            const source = this.nodes[edge.source];
            const target = this.nodes[edge.target];
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const force = this.springStrength * (distance - this.idealEdgeLength) / distance;

            // If both endpoints are anchored, skip.
            if (!source.isNew && !target.isNew) return;

            if (source.isNew) {
                source.vx += force * dx / source.mass;
                source.vy += force * dy / source.mass;
            }
            if (target.isNew) {
                target.vx -= force * dx / target.mass;
                target.vy -= force * dy / target.mass;
            }
        });

        // Apply repulsive forces between node pairs.
        // Only apply forces if at least one of the nodes is new.
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeA = this.nodes[i];
                const nodeB = this.nodes[j];

                // Skip if both nodes are anchored.
                if (!nodeA.isNew && !nodeB.isNew) continue;

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distanceSquared = dx * dx + dy * dy || 0.1;
                const distance = Math.sqrt(distanceSquared);
                const effectiveDistance = Math.max(distance, nodeA.width/2 + nodeB.width/2 + this.minEdgeDistance);
                const nodeRepulsionFactor = this.repulsionStrength / (effectiveDistance * effectiveDistance);
                const forceX = (dx / distance) * nodeRepulsionFactor;
                const forceY = (dy / distance) * nodeRepulsionFactor;
                
                if (nodeA.isNew) {
                    nodeA.vx -= forceX / nodeA.mass;
                    nodeA.vy -= forceY / nodeA.mass;
                }
                if (nodeB.isNew) {
                    nodeB.vx += forceX / nodeB.mass;
                    nodeB.vy += forceY / nodeB.mass;
                }
            }
        }
        
        // Apply edge-edge repulsion similarly:
        for (let i = 0; i < this.edges.length; i++) {
            for (let j = i + 1; j < this.edges.length; j++) {
                const edgeA = this.edges[i];
                const edgeB = this.edges[j];
                
                // Skip if edges share a node.
                if (edgeA.source === edgeB.source || edgeA.source === edgeB.target || 
                    edgeA.target === edgeB.source || edgeA.target === edgeB.target) {
                    continue;
                }
                
                const sourceA = this.nodes[edgeA.source];
                const targetA = this.nodes[edgeA.target];
                const sourceB = this.nodes[edgeB.source];
                const targetB = this.nodes[edgeB.target];
                
                // Skip if all endpoints are anchored.
                if (!sourceA.isNew && !targetA.isNew && !sourceB.isNew && !targetB.isNew) {
                    continue;
                }
                
                const closestPoints = this.closestPointsBetweenSegments(
                    sourceA.x, sourceA.y, targetA.x, targetA.y,
                    sourceB.x, sourceB.y, targetB.x, targetB.y
                );
                
                if (!closestPoints) continue;
                const { point1, point2, distance } = closestPoints;
                
                if (distance < this.minEdgeDistance) {
                    const dx = point2.x - point1.x;
                    const dy = point2.y - point1.y;
                    const magnitude = Math.sqrt(dx * dx + dy * dy) || 0.1;
                    const edgeRepulsionFactor = this.edgeRepulsionStrength * (this.minEdgeDistance - distance) / this.minEdgeDistance;
                    const forceX = (dx / magnitude) * edgeRepulsionFactor;
                    const forceY = (dy / magnitude) * edgeRepulsionFactor;
                    
                    if (sourceA.isNew) {
                        sourceA.vx -= forceX * 0.5;
                        sourceA.vy -= forceY * 0.5;
                    }
                    if (targetA.isNew) {
                        targetA.vx -= forceX * 0.5;
                        targetA.vy -= forceY * 0.5;
                    }
                    if (sourceB.isNew) {
                        sourceB.vx += forceX * 0.5;
                        sourceB.vy += forceY * 0.5;
                    }
                    if (targetB.isNew) {
                        targetB.vx += forceX * 0.5;
                        targetB.vy += forceY * 0.5;
                    }
                }
            }
        }
        
        // Update positions: only new nodes change their positions.
        this.nodes.forEach(node => {
            if (node.isNew) {
                node.x += node.vx * this.alpha;
                node.y += node.vy * this.alpha;

                // Keep nodes within bounds
                const padding = 20;
                node.x = Math.max(padding, Math.min(this.width - padding, node.x));
                node.y = Math.max(padding, Math.min(this.height - padding, node.y));
            }
        });

        // Reduce simulation strength (alpha) for damping
        this.alpha *= this.dampingFactor;
    }
    
    // Helper method to compute the closest points between two line segments.
    closestPointsBetweenSegments(x1, y1, x2, y2, x3, y3, x4, y4) {
        const dx1 = x2 - x1;
        const dy1 = y2 - y1;
        const dx2 = x4 - x3;
        const dy2 = y4 - y3;
        
        const len1Squared = dx1 * dx1 + dy1 * dy1;
        const len2Squared = dx2 * dx2 + dy2 * dy2;
        
        if (len1Squared < 0.0001 || len2Squared < 0.0001) {
            const distance = Math.sqrt((x1 - x3)**2 + (y1 - y3)**2);
            return { point1: { x: x1, y: y1 }, point2: { x: x3, y: y3 }, distance };
        }
        
        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) < 0.0001) {
            let minDist = Number.MAX_VALUE;
            let p1 = null, p2 = null;
            const testPoints = [
                { p1: { x: x1, y: y1 }, p2: { x: x3, y: y3 } },
                { p1: { x: x1, y: y1 }, p2: { x: x4, y: y4 } },
                { p1: { x: x2, y: y2 }, p2: { x: x3, y: y3 } },
                { p1: { x: x2, y: y2 }, p2: { x: x4, y: y4 } }
            ];
            for (const { p1: pt1, p2: pt2 } of testPoints) {
                const d = Math.sqrt((pt1.x - pt2.x)**2 + (pt1.y - pt2.y)**2);
                if (d < minDist) { minDist = d; p1 = pt1; p2 = pt2; }
            }
            return { point1: p1, point2: p2, distance: minDist };
        }
        
        const dx3 = x1 - x3;
        const dy3 = y1 - y3;
        const t1 = (dx3 * dy2 - dy3 * dx2) / cross;
        const t2 = (dx3 * dy1 - dy3 * dx1) / cross;
        const t1Clamped = Math.max(0, Math.min(1, t1));
        const t2Clamped = Math.max(0, Math.min(1, t2));
        
        const point1 = { x: x1 + t1Clamped * dx1, y: y1 + t1Clamped * dy1 };
        const point2 = { x: x3 + t2Clamped * dx2, y: y3 + t2Clamped * dy2 };
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { point1, point2, distance };
    }
    
    // Update Cytoscape node positions. If animate is true, use animation.
    updateNodePositions(animate = false) {
        if (animate && !this.isAnimating) {
            this.isAnimating = true;
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
            Promise.all(animations).then(() => {
                this.isAnimating = false;
            });
        } else {
            this.nodes.forEach(node => {
                node.node.position({ x: node.x, y: node.y });
            });
        }
    }

    // Add a new node using an incremental strategy.
    addNode(nodeData, connectedToIds = []) {
        // Create the Cytoscape node.
        const newCyNode = this.cy.add({
            group: 'nodes',
            data: nodeData
        });
        
        // Determine an initial position based on connected nodes.
        let initialX = this.width / 2;
        let initialY = this.height / 2;
        if (connectedToIds.length > 0) {
            let sumX = 0, sumY = 0, count = 0;
            connectedToIds.forEach(id => {
                const connectedNode = this.nodes.find(n => n.id === id);
                if (connectedNode) {
                    sumX += connectedNode.x;
                    sumY += connectedNode.y;
                    count++;
                }
            });
            if (count > 0) {
                initialX = sumX / count;
                initialY = sumY / count;
                const offset = this.idealEdgeLength * 0.75;
                initialX += (Math.random() - 0.5) * offset;
                initialY += (Math.random() - 0.5) * offset;
            }
        } else {
            const padding = 50;
            initialX = padding + Math.random() * (this.width - 2 * padding);
            initialY = padding + Math.random() * (this.height - 2 * padding);
        }
        
        newCyNode.position({ x: initialX, y: initialY });
        
        // Mark new node as "new" so it will be adjusted incrementally.
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
            height: newCyNode.height() || 50,
            isNew: true
        };
        this.nodes.push(newNode);
        
        // Create edges to connected nodes.
        connectedToIds.forEach(targetId => {
            const targetIndex = this.nodes.findIndex(n => n.id === targetId);
            if (targetIndex >= 0) {
                const newCyEdge = this.cy.add({
                    group: 'edges',
                    data: { source: nodeData.id, target: targetId }
                });
                const newEdge = {
                    source: newNodeIndex,
                    target: targetIndex,
                    edge: newCyEdge,
                    weight: 1
                };
                this.edges.push(newEdge);
            }
        });
        
        // Run a partial simulation to integrate the new node smoothly.
        this.animateNewNodeIntegration(newNode);
        return newCyNode;
    }
    
    // Animate the integration of a new node.
    animateNewNodeIntegration(newNode) {
        this.alpha = 0.3;
        const frames = 30;
        const frameDelay = 16; // ~60fps
        
        const initialPositions = this.nodes.map(node => ({ x: node.x, y: node.y }));
        
        // Run several iterations to let the forces settle.
        for (let i = 0; i < 75; i++) {
            this.applyLayout();
        }
        
        const finalPositions = this.nodes.map(node => ({ x: node.x, y: node.y }));
        
        // Reset positions to initial for the animation.
        this.nodes.forEach((node, i) => {
            node.x = initialPositions[i].x;
            node.y = initialPositions[i].y;
        });
        
        let frame = 0;
        const animateFrame = () => {
            const progress = frame / frames;
            const easedProgress = this.easeInOutCubic(progress);
            this.nodes.forEach((node, i) => {
                const initPos = initialPositions[i];
                const finalPos = finalPositions[i];
                node.x = initPos.x + (finalPos.x - initPos.x) * easedProgress;
                node.y = initPos.y + (finalPos.y - initPos.y) * easedProgress;
            });
            this.nodes.forEach(node => {
                node.node.position({ x: node.x, y: node.y });
            });
            frame++;
            if (frame <= frames) {
                requestAnimationFrame(animateFrame);
            }
        };
        requestAnimationFrame(animateFrame);
    }
    
    // Easing function for smooth animation.
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // A helper to find closest points between two line segments.
    closestPointsBetweenSegments(x1, y1, x2, y2, x3, y3, x4, y4) {
        const dx1 = x2 - x1, dy1 = y2 - y1;
        const dx2 = x4 - x3, dy2 = y4 - y3;
        const len1Squared = dx1 * dx1 + dy1 * dy1;
        const len2Squared = dx2 * dx2 + dy2 * dy2;
        if (len1Squared < 0.0001 || len2Squared < 0.0001) {
            const distance = Math.sqrt((x1 - x3)**2 + (y1 - y3)**2);
            return { point1: { x: x1, y: y1 }, point2: { x: x3, y: y3 }, distance };
        }
        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) < 0.0001) {
            let minDist = Number.MAX_VALUE, p1 = null, p2 = null;
            const testPoints = [
                { p1: { x: x1, y: y1 }, p2: { x: x3, y: y3 } },
                { p1: { x: x1, y: y1 }, p2: { x: x4, y: y4 } },
                { p1: { x: x2, y: y2 }, p2: { x: x3, y: y3 } },
                { p1: { x: x2, y: y2 }, p2: { x: x4, y: y4 } }
            ];
            for (const { p1, p2 } of testPoints) {
                const d = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
                if (d < minDist) { minDist = d; p1 = p1; p2 = p2; }
            }
            return { point1: p1, point2: p2, distance: minDist };
        }
        const dx3 = x1 - x3, dy3 = y1 - y3;
        const t1 = (dx3 * dy2 - dy3 * dx2) / cross;
        const t2 = (dx3 * dy1 - dy3 * dx1) / cross;
        const t1Clamped = Math.max(0, Math.min(1, t1));
        const t2Clamped = Math.max(0, Math.min(1, t2));
        const point1 = { x: x1 + t1Clamped * dx1, y: y1 + t1Clamped * dy1 };
        const point2 = { x: x3 + t2Clamped * dx2, y: y3 + t2Clamped * dy2 };
        const dx = point2.x - point1.x, dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { point1, point2, distance };
    }
}

// Expose in browser context.
if (typeof window !== 'undefined') {
    window.ForceDirectedLayout = ForceDirectedLayout;
}

// Export for module environments.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceDirectedLayout;
}
