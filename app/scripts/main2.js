'use strict';

(function($, THREE, Leap) {

	var camera, scene, renderer;
	var geometry, material, mesh;
	var stats;

	var initOrbitCtrls = function(camera, renderer){
		return new THREE.OrbitControls(camera, renderer.domElement);
	};

	var init = function() {

		var helpGrid = function(){
			return new THREE.GridHelper(400, 10);
		};

		var width = $('#render_area').parent().innerWidth();
		var height = window.innerHeight - $('#render_area').offset().top - 20;


		camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
		camera.position.y = 160;
		camera.position.z = 800;

		scene = new THREE.Scene();

		geometry = new THREE.CubeGeometry(80, 11.5, 30);
		material = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			wireframe: true
		});

		scene.add(new THREE.AxisHelper(400));

		scene.add(helpGrid());


		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		renderer = new THREE.CanvasRenderer();
		renderer.setSize(width, height);

		//document.body.appendChild(renderer.domElement);
		$('#render_area')[0].appendChild(renderer.domElement);

		initOrbitCtrls(camera, renderer);

		stats = new Stats();
		
		$('#stats_wrap').append($(stats.domElement));

		return scene;

	};

	var animate = function() {

		// note: three.js includes requestAnimationFrame shim
		requestAnimationFrame(animate);

		handMeshHolder.update();
		fingerMeshHolder.update();
		renderer.render(scene, camera);
		stats.update();

	};

	init();

	var LeapModelHolder = function(option){
		var self = this;
		var holder = {};

		var children = [];

		var onLoop = option.onLoop || function(){};

		var update = function(frame){
			self.onLoop.call(self, frame);
			children.forEach(function(child){
				if(typeof child.update === 'function'){
					child.update.call(child, frame);
				}
			});
		};

		if(typeof option.init === 'function'){
			option.init.call(self);
		}
	};

	var leapHandsHolder = new LeapModelHolder({
		onLoop: function(frame){
		}
	});

	var handsHolder = {};
	var handMeshHolder = SphereHandMesh(scene, handsHolder);
	var fingersHolder = {};
	var fingerMeshHolder = SphereFingerMesh(scene, fingersHolder);

	animate();

	if(Leap){
		Leap.loop({
			enableGestures: true
		}, function(frame){

			var l, hand, m, ids = {}, p, figs = {};
			var msg = ['hands data: ', handsHolder];
			if(!frame || !frame.hands || frame.hands.length === 0){
				for(var id in handsHolder){
					delete handsHolder[id];
				}
				for(var fId in fingersHolder){
					delete fingersHolder[fId];
				}
			}else{
				l = frame.hands.length;
				ids = {};
				msg.push('length: ' + l);
				for(var i = 0; i < l; i++){
					hand = frame.hands[i];
					ids[hand.id] = true;
					handsHolder[hand.id] = hand;
					msg.push('id: ' + hand.id);


					if(hand.pointables){
						p = hand.pointables;
						p.forEach(function(pointable, i){
							if(pointable.tool){
								msg.push('tool');
							}else{
								msg.push('type: ' + pointable.type);
								figs[pointable.id] = true;
								fingersHolder[pointable.id] = pointable;
							}
							msg.push('fingerId: ' + pointable.id);
							if(pointable.bones){
								msg.push('bones: ' + pointable.bones.length);
							}
						});
					}

				}
				for(var id in handsHolder){
					if(!ids[id]){
						delete handsHolder[id];
					}
				}

				for(var fId in fingersHolder){
					if(!figs[fId]){
						scene.remove(fingersHolder.mesh);
						fingersHolder[fId] = null;
					}
				}

			}

			if(false && frame.gestures){
				frame.gestures.forEach(function(it){
					if(it.type === 'swipe'){
						//console.log(it.speed);
						mesh.rotation.z -= it.direction[0]/100;
						mesh.rotation.y += it.direction[1]/100;
						mesh.rotation.x += it.direction[2]/100;
					}
				});
			}
			$('#output').text(msg.join());
		});
	}

})(jQuery, THREE, Leap);
