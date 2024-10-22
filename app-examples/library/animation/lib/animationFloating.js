// Copyright © 2024 Docusign, Inc.
// Based on file: https://github.com/mrdoob/three.js/blob/master/examples/webgl_mesh_batch.html
// license (MIT): https://github.com/mrdoob/three.js/blob/master/LICENSE
// 
// Updates are License: MIT Open Source https://opensource.org/licenses/MIT
//

//import * as THREE from 'https://unpkg.com/three@0.169/build/three.module.min.js';
import * as THREE from './three.module.min.js';
import { OrbitControls } from './OrbitControls.js';
//import { OrbitControls } from 'https://unpkg.com/three@0.169/examples/jsm/controls/OrbitControls.js';
//import * as THREE from './lib/three.module.min.js';
//  NOTE BENA: Both this three import and the three import within OrbitControls must
//             be from the exact same three module path/URL or the lib will be loaded twice
import { radixSort } from './SortUtils.js';

/***
 * AnimationFloater is a class version of the source three js 
 * animation example
 */
class AnimationFloating {
    // class variables
    camera; controls; scene; renderer;
    geometries; mesh; material;
    ids = [];
    matrix = new THREE.Matrix4();
    position = new THREE.Vector3();
    rotation = new THREE.Euler();
    quaternion = new THREE.Quaternion();
    scale = new THREE.Vector3();
    MAX_GEOMETRY_COUNT = 20000;
    Method = {
        BATCHED: 'BATCHED',
        NAIVE: 'NAIVE'
    };
    api = {
        method: this.Method.BATCHED,
        count: 256,
        dynamic: 16,

        sortObjects: true,
        perObjectFrustumCulled: true,
        opacity: 1,
        useCustomSort: true,
    };

    /***
     * parentEl -- the parent element (not its ID)
     * backgroundColor -- in hex
     * getSize function(parentEl) returns ({height, width}) of the parentEl
     */
    constructor(args) {
        this.parentEl = args.parentEl; // the element itself
        this.backgroundColor = args.backgroundColor;
        this.getSize = args.getSize;

        this.rendered = false; // Is the animation loader being shown?
        this.animate = this.animate.bind(this);
    }

    /***
     * show -- creates and shows the animation
     */
    show() {
        if (this.rendered) {return}
        this.init();
        this.initGeometries();
        this.initMesh();
        this.rendered = true;
    }

    /***
     * destroy -- deletes the dom element
     * After calling delete, delete this instance of the class 
     */
    destroy() {
        if (!this.rendered) {return}
        this.renderer.setAnimationLoop(null);
        $(this.parentEl).empty();
        this.rendered = false;
    }
    
    /***
     * The remainder of this file is from the three JS source file
     */
    randomizeMatrix(matrix) {
        this.position.x = Math.random() * 40 - 20;
        this.position.y = Math.random() * 40 - 20;
        this.position.z = Math.random() * 40 - 20;
        this.rotation.x = Math.random() * 2 * Math.PI;
        this.rotation.y = Math.random() * 2 * Math.PI;
        this.rotation.z = Math.random() * 2 * Math.PI;
        this.quaternion.setFromEuler( this.rotation );
        this.scale.x = this.scale.y = this.scale.z = 0.5 + ( Math.random() * 0.5 );
        return matrix.compose(this.position, this.quaternion, this.scale);
    }

    randomizeRotationSpeed( rotation ) {
        rotation.x = Math.random() * 0.01;
        rotation.y = Math.random() * 0.01;
        rotation.z = Math.random() * 0.01;
        return rotation;
    }

    initGeometries() {
        this.geometries = [
            new THREE.ConeGeometry( 1.0, 2.0 ),
            new THREE.BoxGeometry( 2.0, 2.0, 2.0 ),
            new THREE.SphereGeometry( 1.0, 16, 8 ),
        ]
    }

    createMaterial() {
        if ( ! this.material ) {
            this.material = new THREE.MeshNormalMaterial();
        }
        return this.material;
    }

    cleanup() {
        if ( this.mesh ) {
            this.mesh.parent.remove( this.mesh );
            if ( this.mesh.dispose ) {
                this.mesh.dispose();
            }
        }
    }

    initMesh() {
        this.cleanup();
        if ( this.api.method === this.Method.BATCHED ) {
            this.initBatchedMesh();
        } else {
            this.initRegularMesh();
        }
    }

    initRegularMesh() {
        this.mesh = new THREE.Group();
        const material = this.createMaterial();
        for ( let i = 0; i < this.api.count; i ++ ) {
            const child = new THREE.Mesh( this.geometries[ i % this.geometries.length ], material );
            this.randomizeMatrix( child.matrix );
            child.matrix.decompose( child.position, child.quaternion, child.scale );
            child.userData.rotationSpeed = this.randomizeRotationSpeed( new THREE.Euler() );
            this.mesh.add( child );
        }
        this.scene.add( this.mesh );
    }

    initBatchedMesh() {
        const geometryCount = this.api.count;
        const vertexCount = this.geometries.length * 512;
        const indexCount = this.geometries.length * 1024;
        const euler = new THREE.Euler();
        const matrix = new THREE.Matrix4();
        this.mesh = new THREE.BatchedMesh( geometryCount, vertexCount, indexCount, this.createMaterial() );
        this.mesh.userData.rotationSpeeds = [];
        // disable full-object frustum culling since all of the objects can be dynamic.
        this.mesh.frustumCulled = false;
        this.ids.length = 0;
        const geometryIds = [
            this.mesh.addGeometry( this.geometries[ 0 ] ),
            this.mesh.addGeometry( this.geometries[ 1 ] ),
            this.mesh.addGeometry( this.geometries[ 2 ] ),
        ];
        for ( let i = 0; i < this.api.count; i ++ ) {
            const id = this.mesh.addInstance( geometryIds[ i % geometryIds.length ] );
            this.mesh.setMatrixAt( id, this.randomizeMatrix( matrix ) );
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationFromEuler( this.randomizeRotationSpeed( euler ) );
            this.mesh.userData.rotationSpeeds.push( rotationMatrix );
            this.ids.push( id );
        }
        this.scene.add( this.mesh );
    }

    init() {
        //const width = this.parentEl.innerWidth; // when drawing on body
        //const height = this.parentEl.innerHeight;
        const clientRect = this.getSize(this.parentEl);
        const width = clientRect.width;
        const height = clientRect.height;

        // camera
        this.camera = new THREE.PerspectiveCamera( 70, width / height, 1, 100 );
        this.camera.position.z = 30;
        // renderer
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( this.parentEl.devicePixelRatio );
        this.renderer.setSize( width, height );
        this.renderer.setAnimationLoop( this.animate );

        // ADD TO PAGE
        this.parentEl.appendChild( this.renderer.domElement );

        // scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( this.backgroundColor );

        // controls
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1.0;

        // listeners
        this.onWindowResize = this.onWindowResize.bind(this); 
        this.parentEl.addEventListener( 'resize', this.onWindowResize );
    }

    sortFunction( list ) {
        // initialize options
        this._options = this._options || {
            get: el => el.z,
            aux: new Array( this.maxInstanceCount )
        };

        const options = this._options;
        options.reversed = this.material.transparent;
        let minZ = Infinity;
        let maxZ = - Infinity;
        for ( let i = 0, l = list.length; i < l; i ++ ) {
            const z = list[ i ].z;
            if ( z > maxZ ) maxZ = z;
            if ( z < minZ ) minZ = z;
        }

        // convert depth to unsigned 32 bit range
        const depthDelta = maxZ - minZ;
        const factor = ( 2 ** 32 - 1 ) / depthDelta; // UINT32_MAX / z range
        for ( let i = 0, l = list.length; i < l; i ++ ) {
            list[ i ].z -= minZ;
            list[ i ].z *= factor;
        }

        // perform a fast-sort using the hybrid radix sort function
        radixSort( list, options );
    }

    onWindowResize() {
        const clientRect = this.getSize(this.parentEl);
        const width = clientRect.width;
        const height = clientRect.height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( width, height );
    }

    animate() {
        this.animateMeshes();
        this.controls.update();
        this.render();
    }

    animateMeshes() {
        const loopNum = Math.min( this.api.count, this.api.dynamic );
        if ( this.api.method === this.Method.BATCHED ) {
            for ( let i = 0; i < loopNum; i ++ ) {
                const rotationMatrix = this.mesh.userData.rotationSpeeds[ i ];
                const id = this.ids[ i ];
                this.mesh.getMatrixAt( id, this.matrix );
                this.matrix.multiply( rotationMatrix );
                this.mesh.setMatrixAt( id, this.matrix );
            }
        } else {
            for ( let i = 0; i < loopNum; i ++ ) {
                const child = this.mesh.children[ i ];
                const rotationSpeed = child.userData.rotationSpeed;
                child.rotation.set(
                    child.rotation.x + rotationSpeed.x,
                    child.rotation.y + rotationSpeed.y,
                    child.rotation.z + rotationSpeed.z
                );
            }
        }
    }

    render() {
        if ( this.mesh.isBatchedMesh ) {
            this.mesh.sortObjects = this.api.sortObjects;
            this.mesh.perObjectFrustumCulled = this.api.perObjectFrustumCulled;
            this.mesh.setCustomSort( this.api.useCustomSort ? this.sortFunction : null );
        }
        this.renderer.render( this.scene, this.camera );
    }
}

export { AnimationFloating };


