'use strict';

(function(Leap){
	Leap.plugin('handGrab', function(options){
		var opts = options || {};
		var threshold = opts.threshold || 1;
		return{
			hand: function(hand){
				if(hand.grabStrength >= threshold){
					if(!hand.data('isGrabbing')){
						hand.data('isGrabbing', true);
						this.emit('handGrab', hand);
					}
				}else{
					if(hand.data('isGrabbing')){
						hand.data('isGrabbing', false);
						this.emit('handOpen', hand);
					}
				}
			}
		};
	});
	Leap.plugin('keyDoubleTap', function(options){
		var opts = options || {};
		var interval = opts.interval || 500;
		return{
			frame: function(frame){
				var self = this;
				var nowTime = new Date() - 0;
				if(frame.valid && frame.gestures && frame.gestures.length){
					frame.gestures.forEach(function(gesture){
						if(gesture.type === 'keyTap'){
							gesture.pointableIds.forEach(function(pid){
								var p = frame.pointable(pid);
								var lastTapTime = p.data('_lastTapTime');
								if(!lastTapTime || nowTime - lastTapTime > interval){
									p.data('_lastTapTime', nowTime);
								}else{
									self.emit('keyDoubleTap', gesture, p);
								}
							});
						}
					});
				}
			}
		};
	});
})(Leap);

(function($, Leap, THREE, Stats){

	var baseBoneRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

	// threejs関連Objectの定義
	var renderer, scene, camera, light;
	var control;

	// FPS計測用
	var stats;

	var editee = [];

	var speed = new THREE.Vector3(0.6, 0.6, 0.6);

	var TapParticles = function(){
		var self = this;
		this._meshes = {};
		this.add = function(p){
			if(p.id){
				self._meshes[p.id] = p;
			}
		};
		this.animate = function(){
			var forDel = [], mesh;
			for(var seq in self._meshes){
				mesh = self._meshes[seq];
				if(mesh.scale.length() > 100){
					forDel.push(seq);
				}else{
					mesh.scale.add(speed);
				}
			}
			forDel.forEach(function(seq){
				scene.remove(self._meshes[seq]);
				delete self._meshes[seq];
			});
		};
	}, tapParticles = new TapParticles();

	var $msg = $('#output');

	// 衝突判定用
	var colider = {
		detect: function(targets, hand){

			// 掌の法線, 位置を取得.
			var pN = new THREE.Vector3().fromArray(hand.palmNormal);
			var pp = new THREE.Vector3().fromArray(hand.palmPosition);
			var sc = new THREE.Vector3().fromArray(hand.sphereCenter);
			var tmp = targets.filter(function(target){
				// 対象メッシュの外接球に掌球の中心を含んでいればtrue.
				var dis = target.position.clone().sub(sc);
				var prj = target.position.clone().sub(pp).dot(pN);
				var br;
				if(prj > 0){
					if(target.geometry && target.geometry.boundingSphere){
						br = target.geometry.boundingSphere.radius;
						return br > dis.length();
					}
				}
				return false;
			});
			return tmp.length > 0 ? tmp[0] : null;
		},
		isIn: function(targets, position){
			var tmp = targets.filter(function(target){
				var dis = target.position.clone().sub(position);
				return dis.length() < target.geometry.boundingSphere.radius;
			});
			return tmp.length > 0 ? tmp[0] : null;
		}
	};

	/**
	 *
	 * Leapのコントローラ定義.
	 *
	 **/
	var leapController = new Leap.Controller({enableGestures: true});
	leapController.use('handHold').use('handEntry').use('handGrab').use('keyDoubleTap').on('handFound', function(hand){
		//手が検出されたフレームのイベントリスナ.
		//meshを作成してhand.dataで保持.
		hand.fingers.forEach(function (finger) {

			var boneMeshes = [];
			var jointMeshes = [];

			finger.bones.forEach(function(bone) {
				var boneMesh = new THREE.Mesh(
					new THREE.CylinderGeometry(3, 3, bone.length),
					new THREE.MeshPhongMaterial()
				);
				boneMesh.castShadow = true;
				boneMesh.material.emissive.setHex(0xffffff);
				scene.add(boneMesh);
				boneMeshes.push(boneMesh);
			});

			for (var i = 0; i < finger.bones.length + 1; i++) {

				var jointMesh = new THREE.Mesh(
					new THREE.SphereGeometry(7, 6, 4),
					new THREE.MeshPhongMaterial()
				);
				jointMesh.castShadow = true;
				jointMesh.material.emissive.setHex(0x0088ce);
				scene.add(jointMesh);
				jointMeshes.push(jointMesh);
			}
			finger.data('boneMeshes', boneMeshes);
			finger.data('jointMeshes', jointMeshes);
		});
	}).on('handLost', function(hand){

		var target;
		//手が消失したフレームのイベントリスナ.
		//holdしているmeshデータをthree.jsから削除.
		hand.fingers.forEach(function (finger) {

			var boneMeshes = finger.data('boneMeshes');
			var jointMeshes = finger.data('jointMeshes');
			boneMeshes.forEach(function(mesh){
				scene.remove(mesh);
			});

			jointMeshes.forEach(function(mesh){
				scene.remove(mesh);
			});

			finger.data({
				boneMeshes: null
			});
		});

		if(target = hand.data('editTarget')){
			target.material = hand.data('grabdedTargetMaterial');
		}

	}).on('handGrab', function(hand){

		var target = colider.detect(editee, hand), material;
		if(target){
			hand.data('editTarget', target);
			hand.data('grabdedTargetMaterial', target.material);
			material = new THREE.MeshBasicMaterial({
				color: 0x0000ff,
				wireframe: true
			});
			target.material = material;

			hand.fingers.forEach(function(finger){
				finger.data('jointMeshes').forEach(function(joint){
					joint.material.emissive.setHex(0xff0080);
				});
			});

		}

	}).on('handOpen', function(hand){
		var target;
		hand.fingers.forEach(function(finger){
			finger.data('jointMeshes').forEach(function(joint){
				joint.material.emissive.setHex(0x0088ce);
			});
		});

		if(target = hand.data('editTarget')){
			target.material = hand.data('grabdedTargetMaterial');
			hand.data({
				editTarget: null,
				grabdedTargetMaterial: null
			});
		}

	}).on('keyDoubleTap', function(gesture, finger){
		//console.log(p);
		var delT;
		if(finger.type === 1){
			delT = colider.isIn(editee, new THREE.Vector3().fromArray(gesture.position));
			if(delT){
				editee = editee.filter(function(t){
					return t.id !== delT.id;
				});
				scene.remove(delT);
			}
			(function(){
				var geometry = new THREE.Geometry();
				//var geometry = new THREE.SphereGeometry(50);
				var numParticles = 30;
				for(var i = 0 ; i < numParticles ; i++) {
					geometry.vertices.push(new THREE.Vector3(
						Math.random() * 20 - 10,
						Math.random() * 20 - 10,
						Math.random() * 20 - 10));
				}

				//var texture =THREE.ImageUtils.loadTexture('images/particle1.png');
				var material = new THREE.ParticleBasicMaterial({
					size: 10,
					color: 0xff8888,
					blending: THREE.AdditiveBlending,
					transparent: true,
					depthTest: false
					//map: texture 
				});

				var mesh = new THREE.ParticleSystem(geometry, material);
				mesh.position = new THREE.Vector3().fromArray(gesture.position);
				mesh.sortParticles = false;
				scene.add(mesh);
				tapParticles.add(mesh);
			})();
		}

	}).on('frame', function(frame){
		var msg = [];

		msg.push('hands: ' + frame.hands.length);

		frame.hands.forEach(function(hand){

			msg.push('id: ' + hand.id);
			hand.fingers.forEach(function(finger){
				msg.push('fingerId: ' + finger.id);
				msg.push('jointMeshes Length: ' + finger.data('jointMeshes').length);
			});
			msg.push('grab strength: ' + hand.grabStrength);
		});

		if(frame.valid && frame.gestures.length > 0){
			frame.gestures.forEach(function(gesture){
				msg.push('gesture: ' + gesture.type);
				$('.gesture-' + gesture.type).removeClass('label-default').addClass('label-primary');
			});
		}else{
			$('.gesture-info').removeClass('label-primary').addClass('label-default');
		}

		$msg.text(msg.join());

		if(frame.gestures.length > 0){
			frame.gestures.forEach(function(gesture){
				if(gesture.type === 'circle'){
					if(gesture.state === 'stop' && gesture.progress > 1){
						gesture.pointableIds.forEach(function(pid){
							var p = frame.pointable(pid);
							if(p.type === 1){
								addCube({
									position: new THREE.Vector3().fromArray(gesture.center)
								});
							}
						});
					}
				}else if(gesture.type === 'swipe'){
					if(gesture.state === 'stop'){
						(function(){
							var d = gesture.direction;
							if(Math.abs(d[1]) > Math.abs(d[0])){
								if(d[1] > 0){
									control.rotateUp(0.05);
								}else{
									control.rotateUp(-0.05);
								}
							}else{
								if(d[0] > 0){
									control.rotateLeft(0.05);
								}else{
									control.rotateLeft(-0.05);
								}
							}
						})();
					}
				}

			});
		}
	}).on('hand', function(hand){
		var prevFrame, prevHand, movement;
		var normal, prevNormal, quat;
		var target;
		if(hand.data('isGrabbing') && (target = hand.data('editTarget'))){
			prevFrame = leapController.frame(1);
			normal = new THREE.Vector3().fromArray(hand.palmNormal);
			if(prevFrame && (prevHand = prevFrame.hand(hand.id))){
				prevNormal = new THREE.Vector3().fromArray(prevHand.palmNormal);
				quat = new THREE.Quaternion().setFromUnitVectors(prevNormal, normal);
				target.quaternion.multiply(quat);
				movement = new THREE.Vector3().fromArray(hand.sphereCenter).sub(new THREE.Vector3().fromArray(prevHand.sphereCenter));
				target.position.add(movement);

			}
		}
	});


	var updateHand = function(hand){

		hand.fingers.forEach(function (finger) {

			finger.data('boneMeshes').forEach(function(mesh, i){
				var bone = finger.bones[i];

				mesh.position.fromArray(bone.center());

				mesh.setRotationFromMatrix(new THREE.Matrix4().fromArray( bone.matrix() ));

				mesh.quaternion.multiply(baseBoneRotation);
			});

			finger.data('jointMeshes').forEach(function(mesh, i){
				var bone = finger.bones[i];

				if (bone) {
					mesh.position.fromArray(bone.prevJoint);
				}else{
					bone = finger.bones[i-1];
					mesh.position.fromArray(bone.nextJoint);
				}

			});

		});

	};

	/**
	 *
	 * three.jsの初期化
	 *
	 **/
	var initScene = function(){

		var plane;
		var width = $('#render_area').innerWidth();
		var height = window.innerHeight - $('#render_area').offset().top - 20;

		console.log(width);
		//renderer = new THREE.CanvasRenderer();
		renderer = new THREE.WebGLRenderer({
			antialias: true
		});
		renderer.shadowMapEnabled = true;
		renderer.setSize(width, height);
		$('#render_area')[0].appendChild(renderer.domElement);

		camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
		camera.position.y = 160;
		camera.position.z = 800;

		// カメラをマウス&キーボードで操作.
		// 要threejs-exampleのOrbitControls.js
		control = new THREE.OrbitControls(camera, renderer.domElement);
		scene = new THREE.Scene();

		scene.add(new THREE.AxisHelper(1000));
		//scene.add(new THREE.GridHelper(400, 10));

		plane = new THREE.Mesh(
			new THREE.PlaneGeometry(1000, 1000, 1, 1),
			new THREE.MeshLambertMaterial({
				side: THREE.DoubleSide,
				color: 0xb0b0b0
			})
		);
		plane.receiveShadow = true;
		plane.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0,0)));
		scene.add(plane);

		light = new THREE.SpotLight(0xffffff, 5, 1000, Math.PI / 2, 1);
		//light.target.position = new THREE.Vector3(200, 0, 0);
		light.position.set(0, 700, 500);
		light.castShadow = true;
		light.shadowCameraVisible = true;
		light.shadowMapWidth = 1024;
		light.shadowMapHeight = 1024;
		scene.add(light);
		scene.add(new THREE.AmbientLight(0x333333));

		// FPS計測器の初期化.
		stats = new Stats();
		$('#stats_wrap').append($(stats.domElement));

		return scene;

	};

	/**
	 *
	 * Leap型の直方体を追加する
	 *
	 **/
	var addLeapCube = function(scene){
		var geometry, material, mesh;

		geometry = new THREE.CubeGeometry(80, 11.5, 30);

		material = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			wireframe: true
		});

		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	};

	/**
	 *
	 * three.jsのフレーム描画.
	 *
	 **/
	var animate = function(){
		leapController.frame(0).hands.forEach(updateHand);
		tapParticles.animate();
		//renderer.clear();
		renderer.render(scene, camera);
		control.update();
		window.requestAnimationFrame(animate);
		stats.update();
	};

	var addCube = function(options){
		var opt = options || {};
		var g = new THREE.BoxGeometry(50, 50, 50);
		var m = new THREE.MeshPhongMaterial({
			color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5)
		});
		var mesh = new THREE.Mesh(g, m);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		var pos = opt.position || new THREE.Vector3();

		mesh.position = pos;
		editee.push(mesh);

		scene.add(mesh);

	};

	$('#add_cube').click(function(){
		addCube({
			position: new THREE.Vector3().fromArray([(Math.random() * 2.0 - 1) * 150, 140, (Math.random() * 2.0 - 1) * 150])
		});
	});

	$(window).on('resize', function(){
		var width = $('#render_area').innerWidth();
		var height = window.innerHeight - $('#render_area').offset().top - 20;
		renderer.setSize(width, height);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	});

	$(function(){
		initScene();
		//addLeapCube(scene);
		leapController.connect();
		animate();
	});

})(jQuery, Leap, THREE, Stats);

