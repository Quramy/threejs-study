'use strict';

var MeshHolder = function(option){
	var self = this;
	
	if(!option){
		return;
	}

	self._meshes = {};
	self._type = option.type;
	self._scene = option.scene;
	self._modelHolder = option.modelHolder;
	self.create = option.create ? option.create : function(){return []};
	self.animate = option.animate ? option.animate : function(){};
	self.add = function(model){
		var meshes;
		if(typeof self.create === 'function'){
			meshes = self.create.call(self, model);
			if(meshes && meshes.length > 0 && model && model.id){
				/*
				if(self._type === 'finger'){
					console.log('add: ' + model.id);
				}*/
				self._meshes[model.id] = meshes;
				meshes.forEach(function(m){
					self._scene.add(m);
				});
			}
		}
	};
	self.activate = function(){
		for(var id in self._modelHolder){
			if(!self._meshes[id]){
				self.add(self._modelHolder[id]);
			}
		}
		return self;
	};
	self.refresh = function(){
		if(typeof self.animate !== 'function'){
			return self;
		}
		for(var id in self._meshes){
			self.animate.call(self, self._modelHolder[id], self._meshes[id]);
		}
		return self;
	};
	self.sweep = function(){
		var i, l;
		for(var id in self._meshes){
			if(!self._modelHolder[id]){
				l = self._meshes[id].length;
				for(i = 0; i < l; i++){
					self._scene.remove(self._meshes[id][i]);
				}
				/*
				if(self._type === 'finger'){
					console.log('remove: ' + id);
				}
			  */
				delete self._meshes[id];
			}
		}
		return self;
	};
	self.update = function(){
		return self.sweep().activate().refresh();
	};
};
