'use strict';

(function(exports, MeshHolder){
	var SphereHandMesh= function(scene, holder){
		return	new MeshHolder({
			type: 'hand',
			modelHolder: holder,
			scene: scene,
			create: function(hand){
				var geo, m;
				geo = new THREE.SphereGeometry(20, 6, 4);
				m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
					color: 0xff0000
				}));
				return [m];
			},
			animate: function(hand, meshes){
				if(meshes && meshes.length > 0){
					meshes[0].position.set(hand.palmPosition[0], hand.palmPosition[1], hand.palmPosition[2]);
				}
			}
		});
	};

	var SphereFingerMesh = function(scene, holder){
		return new MeshHolder({
			type: 'finger',
			modelHolder: holder,
			scene: scene,
			create: function(finger){
				var self = this, geo, meshes = [], m, b = [], l;
				//this.bonemap = {};
				geo = new THREE.SphereGeometry(7, 6, 4);
				m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
					color: 0xff0000
				}));
				meshes.push(m);
				if(finger && finger.bones){
					finger.bones.forEach(function(bone, i){
						if(i > 0){
							var jointBall = new  THREE.Mesh(new THREE.SphereGeometry(7, 5, 4), new THREE.MeshBasicMaterial({
								color: 0xff0000
							}));
							//self.bonemap[meshes.length] = i;
							meshes.push(jointBall);
						}
					});
				}
				return meshes;
			},
			animate: function(finger, meshes){
				var i, bone;
				if(finger && meshes && meshes.length > 0){
					meshes[0].position.set(finger.tipPosition[0], finger.tipPosition[1], finger.tipPosition[2]);
				}

				if(finger && finger.bones){
					/*
						 for(var b = 1; b < meshes.length; b++){
						 i = this.bonemap[b];
						 if(i >= 0){
						 bone = finger.bones[i]
						 meshes[b].position.set(bone.prevJoint[0], bone.prevJoint[1], bone.prevJoint[2]);
						 }
						 }
						 */
					finger.bones.forEach(function(bone, i){
						var m;
						if(meshes[i] && i > 0){
							m = meshes[i];
							m.position.set(bone.prevJoint[0], bone.prevJoint[1], bone.prevJoint[2]);
						}
					});
				}
			}
		});

	};

	exports.SphereHandMesh= SphereHandMesh;
})(window, MeshHolder);


