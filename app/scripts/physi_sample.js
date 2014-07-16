'use strict';

(function($, THREE, Physijs){

	$(function(){

		var initScene, render, renderer, scene, camera, box, light, control;

		Physijs.scripts.worker = 'bower_components/physijs/physijs_worker.js';
		Physijs.scripts.ammo = 'examples/js/ammo.js';

		initScene = function() {
			var ground, groundMaterial;
			var width = $('#rendering').innerWidth(), height = window.innerHeight - $('#rendering').offset().top;
			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.shadowMapEnabled = true;
			renderer.setSize(width, height);
			$('#rendering').append($(renderer.domElement));

			scene = new Physijs.Scene();

			// Camera
			camera = new THREE.PerspectiveCamera( 35, width / height, 1, 1000);
			camera.position.set( 60, 50, 60 );
			camera.lookAt( scene.position );
			control = new THREE.OrbitControls(camera, renderer.domElement);
			scene.add( camera );

			// Light
			light = new THREE.SpotLight(0xffffff, 5, 1000, Math.PI / 2, 1);
			light.position.set(0, 100, 80);
			light.castShadow = true;
			light.shadowMapWidth = 1024;
			light.shadowMapHeight = 1024;
			scene.add(light);

			// Box
			box = new Physijs.BoxMesh(
				new THREE.CubeGeometry( 5, 5, 5 ),
				new THREE.MeshBasicMaterial({ color: 0xff8020 })
			);
			box.position.set(0, 20, 0);
			box.castShadow = true;
			scene.add( box );

			// Ground
			groundMaterial = Physijs.createMaterial(new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.8, 0.3);
			ground = new Physijs.BoxMesh(new THREE.CubeGeometry(100, 1, 100), groundMaterial, 0);
			ground.receiveShadow = true;
			scene.add(ground);

			render();
		};

		render = function() {
			scene.simulate();
			control.update();
			renderer.render(scene, camera);
			window.requestAnimationFrame(render);
		};

		initScene();

	});

})(jQuery, THREE, Physijs);
