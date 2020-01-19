import SpriteText from 'three-spritetext';
import { parse } from './MathParser';

AFRAME.registerComponent('graph', {
    schema: {
        xMin: {
            default: -10
        },
        xMax: {
            default: 10
        },
        yMin: {
            default: -10
        },
        yMax: {
            default: 10
        },
        zMin: {
            default: -10
        },
        zMax: {
            default: 10
        },
        tMin: {
            default: 0
        },
        tMax: {
            default: 50
        },
        segmentsMultiplier: {
            default: 2
        },
        showGrid: {
            default: true
        },
        showGridLabels: {
            default: true
        },
        showAxes: {
            default: false
        },
        showWireframe: {
            default: false
        },
        function: {
            default: "f(u, v) = [1.5 * u, 0.1 * u^2 * cos(v), 0.1 * u^2 * sin(v)]"
        }
    },
    init: function() {
       
    },
    update: function() {

        // function mapping:
        // 1 input 1 output = curve
        // 1 input 2 output = curve
        // 1 input 3 output = curve
        // 2 input 1 output = graph (x,y,f(x,y))
        // 2 input 3 output = graph

        this.function = parse(this.data.function); 
                
        if (this.function.inputSize == 1) {
            this.graph = this.createCurve(this.function.func, this.data);
        } else if (this.function.inputSize == 2) {
            if (this.function.outputSize == 1) {
                this.createGraph((x,y) => [x, y, this.function.func(x,y)], this.data);
            } else {
                this.createGraph(this.function.func, this.data);
            }
        }

        this.root = new THREE.Group();
        this.root.add(this.graph);

        if (this.data.showGrid) {
            this.grid = this.createGrid();
            this.root.add(this.grid);
        }
        if (this.data.showGridLabels) {
            this.labels = this.createAxesLabels();
            this.root.add(this.labels);
        }
        if (this.data.showAxes) {
            this.root.add(this.makeAxes())
        }
        
        this.root.scale.set(0.1,0.1,0.1)
        
        //root.add(this.makeZeroPlanes())
        this.el.setObject3D('mesh', this.root)

        this.el.object3D.colliderBox = new THREE.Box3().setFromObject(this.graph);        
    },
    tick: function() {
        this.el.object3D.colliderBox = new THREE.Box3().setFromObject(this.graph);
    },
    computeMinMaxRange: function (geometry) {

        // reset
        this.xMin = null;
        this.xMax = null;
        this.yMin = null;
        this.yMax = null;
        this.zMin = null;
        this.zMax = null;

        let xValue;
        let yValue;
        let zValue;
        for(let i = 0; i < geometry.attributes.position.array.length; i += 3) {

            xValue = geometry.attributes.position.array[i];
            yValue = geometry.attributes.position.array[i + 1];
            zValue = geometry.attributes.position.array[i + 2];

            if(this.xMin == null || xValue < this.xMin) {
                this.xMin = xValue
            }
            if(this.xMax == null || xValue > this.xMax) {
                this.xMax = xValue
            }
            if(this.yMin == null || yValue < this.yMin) {
                this.yMin = yValue
            }
            if(this.yMax == null || yValue > this.yMax) {
                this.yMax = yValue
            }
            if(this.zMin == null || zValue < this.zMin) {
                this.zMin = zValue
            }
            if(this.zMax == null || zValue > this.zMax) {
                this.zMax = zValue
            }
        }
        this.xRange = this.xMax - this.xMin;
        this.yRange = this.yMax - this.yMin;
        this.zRange = this.zMax - this.zMin;

    },
    createGraph: function(func, setting) {
        // set default values
        const xMin = setting && setting.xMin,
            xMax = setting && setting.xMax,
            zMin = setting && setting.zMin,
            zMax = setting && setting.zMax,
            segmentsMultiplier = setting && setting.segmentsMultiplier;
        
        // calculate ranges
        const xRange = xMax - xMin;
        const zRange = zMax - zMin;

        let segments = Math.max(xRange, zRange, 20);
        segments = Math.floor(segments) * segmentsMultiplier;
        segments = 80;

        // x and y from 0 to 1
        const meshFunction = (x, z, vec3) => {
            // map x,y to range
            x = xRange * x + xMin;
            z = zRange * z + zMin;
            // get z value from function
            const result = func(x, z);
            if (!isNaN(result[0]))
                vec3.set(result[0], result[2] || 0, result[1] || 0);
        };

        if (this.graphGeometry == null) {
            this.graphGeometry = new THREE.ParametricBufferGeometry(meshFunction, segments, segments);
            this.graphGeometry.scale(1, 1, 1);
            this.wireMaterial = this.createWireMaterial(segments);        

            this.graph = new THREE.Mesh(this.graphGeometry, this.wireMaterial);
        } else {
            let vertices = []
            let vec3 = new THREE.Vector3();
            for (let i = 0; i <= segments; i++) {
                for(let j = 0; j <= segments; j++) {
                    let u = i / segments;
                    let v = j / segments;
                    meshFunction(u, v, vec3);
                    vertices.push(vec3.x)
                    vertices.push(vec3.y)
                    vertices.push(vec3.z)
                }
            }
            this.graph.geometry.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3 ) );
            //this.graph.geometry.attributes.position.array = vertices;
            this.graph.geometry.attributes.position.needsUpdate = true;
            //this.graphMesh.geometry = new THREE.ParametricBufferGeometry(meshFunction, segments, segments);
        }

        this.computeMinMaxRange(this.graph.geometry);
        requestAnimationFrame(() => this.calculateVertexColor());
        
    },
    calculateVertexColor: function() {
        var colArr = []
        let color;
        for(let i = 1; i < this.graph.geometry.attributes.position.array.length; i += 3) {
            const yVal = this.graph.geometry.attributes.position.array[i];            
            color = new THREE.Color(0xffffff);
            // only change color if not infinte
            if (isFinite(this.yRange)) {
                color.setHSL(0.7 * (this.yMax - yVal) / this.yRange, 1, 0.5);
            }            
            colArr = colArr.concat([color.r * 255, color.g * 255, color.b * 255]);
        }        
        var colors = new Uint8Array(colArr);
    
        // Don't forget to normalize the array! (third param = true)
        this.graph.geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3, true) );
    },
    createCurve: function(func, setting) {
         // set default values
         const segments = setting && setting.segments || 100,
         radiusSegments = setting && setting.radiusSegments || 6,
         tubeRadius = setting && setting.tubeRadius ||0.1,
         tMin = setting && setting.tMin || 0,
         tMax = setting && setting.tMax || 10;

        const tRange = tMax - tMin;

        function CustomPath (scale) {
            THREE.Curve.call(this);
            this.scale = scale;
        }

        CustomPath.prototype = Object.create(THREE.Curve.prototype);
        CustomPath.prototype.constructor = CustomPath;
        CustomPath.prototype.getPoint = function(t) {
            t = t * tRange + tMin;

            if (Array.isArray(func(t))) {
                return new THREE.Vector3(func(t)[0],func(t)[2] || 0,func(t)[1] || 0);
            } else {
                // draw in xz plane a normal graph
                return new THREE.Vector3(t, func(t), 0);
            }
        }

        const path = new CustomPath(1);

        const tubeGeometry = new THREE.TubeBufferGeometry(path, segments, tubeRadius, radiusSegments, false);
        this.computeMinMaxRange(tubeGeometry);

        var colArr = []
        for(let i = 1; i < tubeGeometry.attributes.position.array.length; i += 3) {
            const color = new THREE.Color(0xffffff);
            color.setHSL((1 * i / tubeGeometry.attributes.position.array.length) % 1 * 0.7, 1, 0.5);            
            colArr = colArr.concat([color.r * 255, color.g * 255, color.b * 255]);
        }        
        var colors = new Uint8Array(colArr);
       
       // Don't forget to normalize the array! (third param = true)
       tubeGeometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3, true) );

        const wireMaterial = this.createWireMaterial(segments);
        if (wireMaterial.map) {
            wireMaterial.map.repeat.set(segments, radiusSegments);
        }
        return new THREE.Mesh(tubeGeometry, wireMaterial);
    },
    createWireMaterial: function(segments = 40) {
        if (this.wireTexture == null) {
            var loader = new THREE.TextureLoader();
            const squareImageUrl = require('../../images/square.png').default;
            this.wireTexture = loader.load(squareImageUrl);
        }
        this.wireTexture.wrapS = this.wireTexture.wrapT = THREE.RepeatWrapping;
        this.wireTexture.repeat.set(segments, segments);
        return new THREE.MeshStandardMaterial({roughness: 1, metalness: 0.2, map: this.data.showWireframe ? this.wireTexture : null, vertexColors: THREE.VertexColors, side: THREE.DoubleSide });
    },
    createTransparentWireMaterial: function(width, height){
        const transparentWireMaterial = new THREE.MeshBasicMaterial();
        if (this.alphaTexture == null) {
            const alphaMapURL = require('../../images/square_inv.png').default;
            var loader = new THREE.TextureLoader();
            this.alphaTexture = loader.load(alphaMapURL);
        }
        this.alphaTexture.wrapS = this.alphaTexture.wrapT = THREE.RepeatWrapping;
        this.alphaTexture.repeat.set(width, height);
        transparentWireMaterial.alphaMap = this.alphaTexture;
        transparentWireMaterial.transparent = true;
        transparentWireMaterial.opacity = 0.5;
        transparentWireMaterial.color.setHex(0x000000);
        return transparentWireMaterial;
    },
    makeAxes: function () {
        var size = Math.min(this.xRange, this.yRange, this.zRange) / 2
        var axes = new THREE.AxesHelper(size);
        axes.position.set(this.xMin, this.yMin, this.zMin)
        return axes;
    },
    createGrid: function() {
        
        this.gridGeometry = new THREE.PlaneGeometry(this.xRange, this.zRange);
        this.gridGeometry.scale(1, 1, 1);
        this.gridGeometry.rotateX(-Math.PI / 2)
        this.gridGeometry.rotateY(Math.PI)

        const graphMesh = new THREE.Mesh(this.gridGeometry, this.createTransparentWireMaterial(this.xRange, this.zRange));
        graphMesh.position.set(this.xMin + this.xRange / 2, this.yMin, this.zMin + this.zRange / 2);

        const grid = new THREE.Group();

        // back
        this.gridGeometry2 = new THREE.PlaneBufferGeometry(this.xRange, this.yRange);
        this.gridGeometry2.scale(1, 1, 1);
        const graphMesh2 = new THREE.Mesh(this.gridGeometry2, this.createTransparentWireMaterial(this.xRange, this.yRange));
        graphMesh2.position.set(this.xMin + this.xRange / 2, this.yMin + this.yRange / 2, this.zMin);
        
        // front
        this.gridGeometry3 = new THREE.PlaneBufferGeometry(this.xRange, this.yRange);
        this.gridGeometry3.scale(1, 1, 1);
        this.gridGeometry3.rotateX(Math.PI)
        const graphMesh3 = new THREE.Mesh(this.gridGeometry3, this.createTransparentWireMaterial(this.xRange, this.yRange));
        graphMesh3.position.set(this.xMin + this.xRange / 2,  this.yMin + this.yRange / 2, this.zMax);

        // left
        this.gridGeometry4 = new THREE.PlaneBufferGeometry(this.zRange, this.yRange);
        this.gridGeometry4.scale(1, 1, 1);
        this.gridGeometry4.rotateY(Math.PI / 2)
        this.gridGeometry4.rotateX(Math.PI)
        const graphMesh4 = new THREE.Mesh(this.gridGeometry4, this.createTransparentWireMaterial(this.zRange, this.yRange));
        graphMesh4.position.set(this.xMin, this.yMin + this.yRange / 2, this.zMin + this.zRange / 2);
        
        // right
        this.gridGeometry5 = new THREE.PlaneBufferGeometry(this.zRange, this.yRange);
        this.gridGeometry5.scale(1, 1, 1);
        this.gridGeometry5.rotateY(Math.PI / 2 + Math.PI)
        const graphMesh5 = new THREE.Mesh(this.gridGeometry5, this.createTransparentWireMaterial(this.zRange, this.yRange));
        graphMesh5.position.set(this.xMax,  this.yMin + this.yRange / 2, this.zMin + this.zRange / 2);

        grid.add(graphMesh);
        grid.add(graphMesh2);
        grid.add(graphMesh3);
        grid.add(graphMesh4);
        grid.add(graphMesh5);

        return grid;
    },
    createAxesLabels: function() {

        const labels = new THREE.Group();

        const xMinText = new SpriteText((Math.floor(this.xMin * 100) / 100).toString(), 0.5, "red");
        xMinText.position.set(this.xMin + 0.2, this.yMin, this.zMin);
        var xMaxText = new SpriteText((Math.floor(this.xMax * 100) / 100).toString(), 0.5, "red");
        xMaxText.position.set(this.xMin + this.xRange, this.yMin, this.zMin)

        labels.add(xMinText);
        labels.add(xMaxText);

        const yMinText = new SpriteText((Math.floor(this.yMin * 100) / 100).toString(), 0.5, "green");
        yMinText.position.set(this.xMin, this.yMin + 0.2, this.zMin);
        var yMaxText = new SpriteText((Math.floor(this.yMax * 100) / 100).toString(), 0.5, "green");
        yMaxText.position.set(this.xMin, this.yMax, this.zMin)

        labels.add(yMinText);
        labels.add(yMaxText);

        const zMinText = new SpriteText((Math.floor(this.zMin * 100) / 100).toString(), 0.5, "blue");
        zMinText.position.set(this.xMin, this.yMin, this.zMin + 0.2);
        var zMaxText = new SpriteText((Math.floor(this.zMax * 100) / 100).toString(), 0.5, "blue");
        zMaxText.position.set(this.xMin, this.yMin ,this.zMin + this.zRange)

        labels.add(zMinText);
        labels.add(zMaxText);

        return labels;
    }
  })