// Copyright © 2024 Docusign, Inc.
// Based on file: https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_rawshader.html
// license (MIT): https://github.com/mrdoob/three.js/blob/master/LICENSE
// 
// Updates are License: MIT Open Source https://opensource.org/licenses/MIT
//
//import * as THREE from 'https://unpkg.com/three@0.169/build/three.module.min.js';
import * as THREE from './three.module.min.js';

/***
 * RawShader is a class version of the source three js animation example
 */
class RawShader {
    // class variables
    container; camera; scene; renderer;

    /***
     * parentEl -- the parent element (not its ID)
     * backgroundColor -- in hex
     * getSize function(parentEl) returns ({height, width}) of the parentEl
     */
    constructor(args) {
        this.container = args.parentEl; // the element itself
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
        this.rendered = true;
    }

    /***
     * destroy -- deletes the dom element
     * After calling delete, delete this instance of the class 
     */
    destroy() {
        if (!this.rendered) {return}
        this.renderer.setAnimationLoop(null);
        $(this.container).empty();
        this.rendered = false;
    }
    
    /***
     * The remainder of this file is from the three JS source file
     */
    init() {
        const vertexShader = `
            precision mediump float;
            precision mediump int;
            uniform mat4 modelViewMatrix; // optional
            uniform mat4 projectionMatrix; // optional
            attribute vec3 position;
            attribute vec4 color;
            varying vec3 vPosition;
            varying vec4 vColor;
            void main()	{
                vPosition = position;
                vColor = color;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`;

        const fragmentShader = `
            precision mediump float;
            precision mediump int;
            uniform float time;
            varying vec3 vPosition;
            varying vec4 vColor;
            void main()	{
                vec4 color = vec4( vColor );
                color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
                gl_FragColor = color;
            }`;

        const clientRect = this.getSize(this.parentEl);
        const width = clientRect.width;
        const height = clientRect.height;
        this.camera = new THREE.PerspectiveCamera( 50, width / height, 1, 10 );
        this.camera.position.z = 2;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( this.backgroundColor );

        // geometry
        // nr of triangles with 3 vertices per triangle
        const vertexCount = 200 * 3;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        for ( let i = 0; i < vertexCount; i ++ ) {
            // adding x,y,z
            positions.push( Math.random() - 0.5 );
            positions.push( Math.random() - 0.5 );
            positions.push( Math.random() - 0.5 );

            // adding r,g,b,a
            colors.push( Math.random() * 255 );
            colors.push( Math.random() * 255 );
            colors.push( Math.random() * 255 );
            colors.push( Math.random() * 255 );
        }

        const positionAttribute = new THREE.Float32BufferAttribute( positions, 3 );
        const colorAttribute = new THREE.Uint8BufferAttribute( colors, 4 );
        colorAttribute.normalized = true; // this will map the buffer values to 0.0f - +1.0f in the shader
        geometry.setAttribute( 'position', positionAttribute );
        geometry.setAttribute( 'color', colorAttribute );

        // material
        const material = new THREE.RawShaderMaterial({
            uniforms: {
                time: { value: 1.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide,
            transparent: true
        });

        const mesh = new THREE.Mesh( geometry, material );
        this.scene.add( mesh );

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio( window.devicePixelRatio );

        this.renderer.setSize( width, height );
        this.renderer.setAnimationLoop( this.animate );
        this.container.appendChild( this.renderer.domElement );
        this.onWindowResize = this.onWindowResize.bind(this); 
        window.addEventListener( 'resize', this.onWindowResize );
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
        const time = performance.now();
        const object = this.scene.children[ 0 ];
        object.rotation.y = time * 0.0005;
        object.material.uniforms.time.value = time * 0.005;
        this.renderer.render( this.scene, this.camera );
    }
}
export { RawShader }