MainSceneManager = function (gameManager) {

    this.game = gameManager;

    //MainScene Obj's
    this.scene = null;
    this.mainCamera = null;
    this.hemiLight = null;

    this.factor = 1;
    this.wallDepth = .03;
    this.roomLength = 10;
    this.roomWidth = 15;
    this.roomDepth = 5;

    this.InputMg = {
        isDragging: false,
        startPoint: null,
        currentTouchedMesh: null,
        currentSelectedMesh: null,
    }
    this.snapValue = .5;

    this.Signs = [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
    ];
    this.indices = [
        4, 5, 1, 0,
        3, 2, 6, 7,
        3, 7, 4, 0,
        1, 5, 6, 2,
        1, 2, 3, 0
    ]
    this.wallIndices = [
        0, 1, 2,
        0, 2, 3,
        // 4,5,6,
        // 4,6,7,
        8, 9, 10,
        8, 10, 11,
        12, 13, 14,
        12, 14, 15,
        16, 17, 18,
        16, 18, 19,
    ]
    this.roomWalls = [];
    this.roomHolder = null;

    this.hdrTexturePath = "https://raw.githubusercontent.com/PatrickRyanMS/BabylonJStextures/master/DDS/environment.dds";

    //Curve points
    this.wgOptions = {
        len: 120.0, s: 0.87, q: 0.998, n: 4.34, r: 18.0,
        tau: 14.5, caH: 100.0, caV: 75.0, resolution: 720,
        FixedPart: 0.2
    }
    this.wgPosZ = { x: 0.0, y: 0.0, z: 0.0, a: 0.0 }
    this.sfOptions = { HRadius: 300, VRadius: 300, m: 4, n1: 6, n2: 5, n3: 5, resolution: 720 }
    this.lines = [];
    this.horn = null;
    this.mergedBox = null;
    this.hxtMesh = null;
    this.hole = [];
};
MainSceneManager.prototype = {

    createScene: function () {
        this.scene = new BABYLON.Scene(this.game.engine);
        this.scene.imageProcessingConfiguration.contrast = 1.6//1.6;
        this.scene.imageProcessingConfiguration.exposure = 0.6//0.6;
        this.scene.imageProcessingConfiguration.toneMappingEnabled = true;

        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    console.log("POINTER DOWN");
                    this.onPointerDown(pointerInfo.event)
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    console.log("POINTER UP");
                    this.onPointerUp(pointerInfo.event)
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.onPointerMove(pointerInfo.event)
                    break;
                case BABYLON.PointerEventTypes.POINTERWHEEL:
                    console.log("POINTER WHEEL");
                    this.MouseWheelHandler(pointerInfo.event)
                    break;
                default:
                    break;
            }
        });

        this.createCamera();
        this.setUpEnvironMent();
        this.createGui();

        // this.createCubePoints();

        return this.scene;
    },
    createCamera: function () {
        this.mainCamera = new BABYLON.ArcRotateCamera("ArcCamera",
            0, 0, 10, new BABYLON.Vector3.Zero(), this.scene);

        this.mainCamera.attachControl(this.game.canvas, true);
        this.mainCamera.alpha = 1.95;
        this.mainCamera.beta = 1.29;

        // this.mainCamera.lowerRadiusLimit = 3.5;
        // this.mainCamera.upperRadiusLimit = 21;
        this.mainCamera.wheelPrecision = 10;
        this.mainCamera.upperBetaLimit = 1.5;
        this.mainCamera.minZ = 0.2;
    },
    setUpEnvironMent: function () {
        //Create Light
        this.hemiLight = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);

        //wall Mat
        this.wallMat = new BABYLON.StandardMaterial("wallMat", this.scene);
        this.wallMat.diffuseColor = new BABYLON.Color3(149 / 255, 190 / 255, 223 / 255);

        // Skybox
        var skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, this.scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("mp_awup/mine", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.EXPLICIT_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        skybox.isPickable = false;


        let skyboxCubecTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
            // this.skyboxPath,
            "environment/environment.env",
            this.scene
        );
        skyboxCubecTexture.gammaSpace = true;
        skyboxCubecTexture.level = 1;

        this.scene.environmentTexture = skyboxCubecTexture;
    },
    createGui: function () {

        var oldgui = document.getElementById("datGUI");
        if (oldgui != null) {
            oldgui.remove();
        }

        this.gui = new dat.GUI();
        this.gui.domElement.style.marginTop = "20px";
        this.gui.domElement.id = "datGUI";
        this.datOptions = {
            Length: '16',
            Width: '8',
            Height: '5',
            Create: () => { this.createCubePoints() },
            Erase: () => { this.eraseAll() },
            SubtactMouthFace: () => { this.subtractMouth() },
            ExportObj: () => { this.exportObj() },

            MakeHxtAirMesh: () => { this.makeAirMesh() },
            WireFrame: false,

            boxRotationY: 0.0,
            boxWidth: 2,
            boxHeight: 2,
            boxDepth: 2,
            lowBoundboxWidth: 0,
            lowBoundboxHeight: 0,
            curveOptions: {
                Depth: 120, S: 0.87, Q: 0.998, N: 4.34, ThroatRadius: 18,
                ThroatExitAngle: 14.5, CoverageHoriz: 100, CoverageVert: 75,
                FixedPart: 0.2,
                Resolution: 4, WGXpos: 0.0, WGYpos: 0.0, WGZpos: 0.0, WGZRotationY: 0.0
            },
            mouthOptions: {
                HRadius: 300, VRadius: 300, M: 4, N1: 6, N2: 5, N3: 5,
            }

        }

        this.gui.add(this.datOptions, "Length").onChange((value) => {
            this.roomLength = value;
        });
        this.gui.add(this.datOptions, "Width").onChange((value) => {
            this.roomWidth = value;
        });
        this.gui.add(this.datOptions, "Height").onChange((value) => {
            this.roomDepth = value;
        });

        this.gui.add(this.datOptions, "Create");

        this.gui.add(this.datOptions, "Erase");

        this.gui.add(this.datOptions, "SubtactMouthFace");

        this.gui.add(this.datOptions, "ExportObj");

        this.gui.add(this.datOptions, "MakeHxtAirMesh");

        this.gui.add(this.datOptions, "WireFrame").onChange((value) => {
            this.wallMat.wireframe = value;
        });
        //this.gui.addb

    },
    createCustomCube: function (name, wallLength) {

        this.wallPoints = [];
        this.wallPoints.length = 8;

        for (let i = 0; i < 4; i++) { //Wall Points
            this.wallPoints[i] = new BABYLON.Vector3(this.Signs[i].x * wallLength / 2, this.roomDepth / 2, this.Signs[i].y * this.wallDepth);
            this.wallPoints[4 + i] = new BABYLON.Vector3(this.Signs[i].x * wallLength / 2, -this.roomDepth / 2, this.Signs[i].y * this.wallDepth);
        }

        //Mesh Properties
        let positions = [];
        var indices = this.wallIndices;
        var normals = [];
        var uvs = [
            1, 1, 0, 1, 0,
            0, 1, 0, 1, 1,
            0, 1, 0, 0, 1,
            0, 1, 1, 0, 1,
            0, 0, 1, 0, 1,
            1, 0, 1, 0, 0,
            1, 0, 1, 1, 0,
            1, 0, 0, 1, 0,
            1, 1, 0, 1, 0,
            0, 1, 0
        ]

        for (let i = 0; i < this.indices.length; i++) {//set mesh postions data
            let v3 = this.wallPoints[this.indices[i]];
            positions.push(v3.x);
            positions.push(v3.y);
            positions.push(v3.z);
        }

        var customMesh = new BABYLON.Mesh(name, this.scene);

        //Calculations of normals added
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        var vertexData = new BABYLON.VertexData();

        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;

        vertexData.applyToMesh(customMesh);

        customMesh.material = this.wallMat;
        customMesh.isPickable = false;

        return customMesh;
    },
    createCubePoints: function () {

        //console.log(this.roomHolder)
        if (this.roomHolder) {
            if (this.mergedBox) return;
            if (this.Mainbox) {
                this.Mainbox.visibility = true;
                this.Mainbox.isPickable = true;
            }
            this.wgCreatePoints();
            return;
        }

        // this.scene.debugLayer.show();
        this.roomHolder = new BABYLON.Mesh("RoomHolder", this.scene); //Main Mesh that's contains all block meshes
        this.roomHolder.isPickable = false;

        let targetLength = this.roomWidth;

        for (let i = 0; i < 4; i++) { //create width walls
            let tmpWall = this.createCustomCube("Custom" + i, targetLength);
            this.roomWalls.push(tmpWall);
            targetLength = (i >= 1) ? this.roomLength : this.roomWidth;

            tmpWall.parent = this.roomHolder;
        }

        //Set wall Planes
        this.roomWalls[0].position.z -= this.roomLength / 2;
        this.roomWalls[0].scaling.z = -1;

        this.roomWalls[1].position.z += this.roomLength / 2;

        this.roomWalls[2].position = new BABYLON.Vector3(-this.roomWidth / 2, 0, 0);
        this.roomWalls[2].rotation.y = Math.PI / 2;
        this.roomWalls[2].scaling.z = -1;

        this.roomWalls[3].position = new BABYLON.Vector3(this.roomWidth / 2, 0, 0);
        this.roomWalls[3].rotation.y = Math.PI / 2;

        //CreateGround
        this.ground = BABYLON.MeshBuilder.CreateGround("ground", { width: this.roomWidth, height: this.roomLength, subdivisions: 4 }, this.scene);
        this.ground.isPickable = false;
        this.ground.position.y -= this.roomDepth / 2;

        this.groundPlanMat = new BABYLON.StandardMaterial("groundMat", this.scene);
        this.groundPlanMat.diffuseTexture = new BABYLON.Texture("Textures/Wood_Floor_006_COLOR.jpg", this.scene);
        this.groundPlanMat.bumpTexture = new BABYLON.Texture("Textures/Wood_Floor_006_NORM.jpg", this.scene);
        this.groundPlanMat.diffuseTexture.uScale = 6.0;
        this.groundPlanMat.diffuseTexture.vScale = 3.0;
        this.groundPlanMat.bumpTexture.uScale = 6.0;
        this.groundPlanMat.bumpTexture.vScale = 3.0;

        this.ground.material = this.groundPlanMat

        this.roof = BABYLON.MeshBuilder.CreatePlane("roof", { width: this.roomWidth, height: this.roomLength }, this.scene);
        this.roof.position.y += this.roomDepth / 2;
        this.roof.rotation.x = Math.PI / 2;
        this.roof.scaling.z = -1;
        this.roof.material = new BABYLON.StandardMaterial("plan", this.scene);
        this.roof.material.emissiveColor = new BABYLON.Color3(192 / 255, 192 / 255, 192 / 255)
        this.roof.isPickable = false;


        this.ground.parent = this.roomHolder;
        this.roof.parent = this.roomHolder;

        this.createRandomObj();//creat cube

    },
    onPointerDown: function (ev) {
        if (ev.button !== 0) {
            return;
        }
        //Pick Item To Move
        // check if we are under a mesh
        var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);//, function (mesh) { return mesh !=ground });
        if (pickInfo.hit) {
            console.log(" */ ", pickInfo.pickedMesh.name, " */ ");
            if (this.InputMg.currentSelectedMesh) {//Item Selected Before
                console.log("There's obj Selected Before")
            }
            this.InputMg.currentSelectedMesh = this.InputMg.currentTouchedMesh = pickInfo.pickedMesh;
            this.InputMg.currentTouchedMesh.showBoundingBox = true;
            this.InputMg.startPoint = this.getGroundPosition(); //= currentTouchedMesh.position;

            this.InputMg.currentTouchedMesh.CompConfig.IsSelected = true;
            // if (this.InputMg.startPoint) { // we need to disconnect camera from canvas
            setTimeout(() => {
                this.mainCamera.detachControl(this.game.canvas);
            }, 0);
            // }
        }
    },
    onPointerUp: function (ev) {
        console.log("Up Mouse");
        if (this.InputMg.currentTouchedMesh) {
            //Back the Ground Textuer
            if (this.InputMg.currentTouchedMesh.CompConfig.tag === "Item") {
                // this.PickUpAnimation(this.InputMg.currentTouchedMesh);
            }
            this.InputMg.startPoint = null;
            this.InputMg.currentTouchedMesh.CompConfig.IsSelected = false;
            this.InputMg.currentTouchedMesh = null;
            this.InputMg.isDragging = false;
        }
        this.mainCamera.attachControl(this.game.canvas, true);
    },
    onPointerMove: function (ev) {
        if (!this.InputMg.currentTouchedMesh)
            return;

        var current = this.getGroundPosition(ev);
        if (!current)
            return;
        var diff = current.subtract(this.InputMg.startPoint);
        this.InputMg.currentTouchedMesh.position.addInPlace(diff);
        this.InputMg.startPoint = current;
    },
    MouseWheelHandler: function (ev) {
        if (!this.InputMg.currentTouchedMesh)
            return;
        var ev = window.event || ev; // old IE support
        var delta = Math.max(-1, Math.min(1, (ev.wheelDelta || -ev.detail)));
        this.InputMg.currentTouchedMesh.rotation.y += Math.PI / 2;

        return false;
    },
    getGroundPosition: function () {
        var pickinfo = this.scene.pick(this.scene.pointerX,
            this.scene.pointerY, (mesh) => { return mesh === this.ground; });
        if (pickinfo.hit)
            return this.VectorSnapping(pickinfo.pickedPoint);
        return null;
    },
    VectorSnapping: function (VtoSnap) {
        var sanpedVector = new BABYLON.Vector3.Zero();
        sanpedVector.x = this.round(VtoSnap.x);
        sanpedVector.y = 0;
        sanpedVector.z = this.round(VtoSnap.z);

        return sanpedVector;
    },
    round: function (input) {
        return this.snapValue * Math.round((input / this.snapValue));
    },
    eraseAll: function () {
    
        if (this.mergedBox != null) {
            this.mergedBox.dispose();
            this.mergedBox = null;
            this.removeLines();
        }

    },
    createMainBox: function (w, h, d, x, y, z) {

        this.Mainbox = BABYLON.MeshBuilder.CreateBox("box", { height: h, width: w, depth: d }, this.scene); // default box
        this.Mainbox.position = new BABYLON.Vector3(
            x,
            y,
            z,
        );
        this.Mainbox.CompConfig = {
            tag: "item",
            IsSelected: false,
        }
        var greyMat = new BABYLON.StandardMaterial("greyMat", this.scene);
        greyMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        greyMat.alpha = 0.1;
        this.Mainbox.material = greyMat;

    },
    checkValid: function (newW, newH, newX, newY, newBW, newBH) {

        if (newX - newBW / 2 < - newW / 2) return false;
        if (newX + newBW / 2 > newW / 2) return false;
        if (newY - newBH / 2 < - newH / 2) return false;
        if (newY + newBH / 2 > newH / 2) return false;
        return true;
    },
    createRandomObj: function () {

        this.boxHeight = 2;
        this.boxWidth = 2;
        this.boxDepth = 2;

        this.createMainBox(this.boxWidth, this.boxHeight, this.boxDepth, 0, (-this.roomDepth / 2) + this.boxHeight / 2, 0)

        var f0 = this.gui.addFolder('Box Position');

        //Create box dat 
        f0.add(this.datOptions, "boxWidth", 1, 10).step(.1).onChange((value) => {
            if (this.Mainbox) {
                if (this.checkValid(
                    value, this.boxHeight,
                    this.curveHolder.position.x, this.curveHolder.position.y,
                    this.datOptions.lowBoundboxWidth, this.datOptions.lowBoundboxHeight)) {
                    this.boxWidth = value
                    var pos = this.Mainbox.position;
                    this.Mainbox.dispose();
                    this.createMainBox(value, this.boxHeight, this.boxDepth, pos.x, pos.y, pos.z);
                    this.createRealCurve();
                }
                else {
                    this.datOptions.boxWidth += .1
                    console.log(value);
                }
                //this.Mainbox.getChildMeshes(false)[0].scaling.x = 1 / this.Mainbox.scaling.x ;
                //this.curveHolder.position.x = this.wgPosZ.x + this.datOptions.curveOptions.WGXpos/1000/this.Mainbox.scaling.x;
            }
        });
        f0.add(this.datOptions, "boxHeight", 1, 10).step(.1).onChange((value) => {
            if (this.Mainbox) {
                if (this.checkValid(
                    this.boxWidth, value,
                    this.curveHolder.position.x, this.curveHolder.position.y,
                    this.datOptions.lowBoundboxWidth, this.datOptions.lowBoundboxHeight)) {
                    this.boxHeight = value
                    var pos = this.Mainbox.position;
                    this.Mainbox.dispose();
                    this.createMainBox(this.boxWidth, value, this.boxDepth, pos.x, (-this.roomDepth / 2) + value / 2, pos.z);
                    this.createRealCurve();
                }
                else {
                    this.datOptions.boxHeight += .1
                }
            }
        });
        f0.add(this.datOptions, "boxDepth", 1, 10).step(.1).onChange((value) => {
            if (this.Mainbox) {
                if (value > this.datOptions.curveOptions.Depth / 1000) {
                    this.boxDepth = value
                    var pos = this.Mainbox.position;
                    this.Mainbox.dispose();
                    this.createMainBox(this.boxWidth, this.boxHeight, value, pos.x, pos.y, pos.z);
                    this.createRealCurve();
                } else {
                    this.datOptions.boxDepth += .1
                }
            }
        });

        f0.add(this.datOptions, "boxRotationY", -180, 180).step(0.5).onChange((value) => {
            if (this.Mainbox)
                this.Mainbox.rotation.y = value * (Math.PI / 180);
            // sphere.scaling = unitVec.scale(value);
        });


        f0.open();

        this.createCubeCurve();




    },

    createRealCurve: function () {
        if (this.curveHolder) this.curveHolder.dispose();
        this.curveHolder = new BABYLON.Mesh("CurveHolder", this.scene);
        // this.curveHolder.rotation.x = Math.PI / 2;
        this.curveHolder.position.z = this.boxDepth / 2;
        this.wgPosZ.x = this.curveHolder.position.x
        this.wgPosZ.y = this.curveHolder.position.y
        this.wgPosZ.z = this.curveHolder.position.z

        this.wgCreatePoints();
    },
    createCubeCurve: function () {

        this.setUpDatControls(this.Mainbox.position.z + this.Mainbox.boxDepth / 2);
        this.createRealCurve();

    },

    setUpDatControls: function () {

        var f1 = this.gui.addFolder('WG Position');
        var f2 = this.gui.addFolder('WG Path');
        var f3 = this.gui.addFolder('WG Shape');
        var f4 = this.gui.addFolder('WG SuperFormula');

        f1.open();
        f2.open();
        f3.open();
        f4.open();


        f1.add(this.datOptions.curveOptions, "WGXpos", -1000, 1000).step(1).onChange((value) => {
            this.curveHolder.position.x = this.wgPosZ.x + this.datOptions.curveOptions.WGXpos / 1000;
        });
        f1.add(this.datOptions.curveOptions, "WGYpos", -1000, 1000).step(1).onChange((value) => {
            this.curveHolder.position.y = this.wgPosZ.y + this.datOptions.curveOptions.WGYpos / 1000;
        });

        f1.add(this.datOptions.curveOptions, "WGZRotationY", -180, 180).step(1).onChange((value) => {

            this.curveHolder.rotation.z = Math.PI * this.datOptions.curveOptions.WGZRotationY / 180

        });

        f2.add(this.datOptions.curveOptions, "ThroatRadius", 0.0, 100).step(0.1).onChange((value) => {
            this.wgOptions.r = value;
            this.wgCreatePoints();
        });
        f2.add(this.datOptions.curveOptions, "ThroatExitAngle", 0.0, 100).step(0.1).onChange((value) => {
            this.wgOptions.tau = value;
            this.wgCreatePoints();
        });
        f2.add(this.datOptions.curveOptions, "Depth", 10, 1000).step(0.1).onChange((value) => {
            this.wgOptions.len = value;
            this.wgCreatePoints();
            this.curveHolder.position.z = this.boxDepth / 2;
        });
        f2.add(this.datOptions.curveOptions, "CoverageHoriz", 0.0, 150).step(0.1).onChange((value) => {
            this.wgOptions.caH = value;
            this.wgCreatePoints();
        });
        f2.add(this.datOptions.curveOptions, "CoverageVert", 0.0, 150).step(0.1).onChange((value) => {
            this.wgOptions.caV = value;
            this.wgCreatePoints();
        });



        f2.add(this.datOptions.curveOptions, "S", 0.0, 10.0).step(0.1).onChange((value) => {
            this.wgOptions.s = value;
            this.wgCreatePoints();
        });
        f2.add(this.datOptions.curveOptions, "Q", 0.0, 1.0).step(0.1).onChange((value) => {
            this.wgOptions.q = value;
            this.wgCreatePoints();
        });
        f2.add(this.datOptions.curveOptions, "N", 0.0, 10.0).step(0.1).onChange((value) => {
            this.wgOptions.n = value;
            this.wgCreatePoints();
        });





        var wgShape =
        {
            Shape: 'raw'
        }

        f3.add(this.datOptions.curveOptions, "FixedPart", 0.0, 1.0).step(0.1).onChange((value) => {
            this.wgOptions.FixedPart = value;
            this.wgCreatePoints();
        });

        f4.add(this.datOptions.mouthOptions, "HRadius", 1, 2000).step(1).onChange((value) => {
            var v = this.sfOptions.HRadius

            this.sfOptions.HRadius = value;
            if (this.wgCreatePoints() == false) {
                this.sfOptions.HRadius = v
                value -= 1
            }

        });
        f4.add(this.datOptions.mouthOptions, "VRadius", 1, 2000).step(1).onChange((value) => {
            this.sfOptions.VRadius = value;
            this.wgCreatePoints();
        });
        f4.add(this.datOptions.mouthOptions, "M", 1, 10).step(1).onChange((value) => {
            this.sfOptions.m = value;
            this.wgCreatePoints();
        });
        f4.add(this.datOptions.mouthOptions, "N1", 0.0, 10.0).step(0.1).onChange((value) => {
            this.sfOptions.n1 = value;
            this.wgCreatePoints();
        });
        f4.add(this.datOptions.mouthOptions, "N2", 0.0, 5).step(0.1).onChange((value) => {
            this.sfOptions.n2 = value;
            this.wgCreatePoints();
        });
        f4.add(this.datOptions.mouthOptions, "N3", 0.0, 5).step(0.1).onChange((value) => {
            this.sfOptions.n3 = value;
            this.wgCreatePoints();
        });
    },
    flipOrient:function (obj){
        orgVertexData = BABYLON.VertexData.ExtractFromMesh( obj, true, true);
        var newNormals=[];       
        var normals     = orgVertexData.normals;
        
        for (let i = 0; i < normals.length; i++)
            newNormals.push(-normals[i]);
            
        var newMesh = new BABYLON.Mesh("flip" + normals.length + " " + orgVertexData.positions.length, this.scene);
            var	vertexData = new BABYLON.VertexData();
                vertexData.indices		= orgVertexData.indices;
                vertexData.positions	= orgVertexData.positions;
                vertexData.normals	    = newNormals;
                vertexData.uvs	        = orgVertexData.uvs;
            vertexData.applyToMesh(newMesh);
            return newMesh;
    },
    makeAirMesh: function () {
        console.log(this.mergedBox)
        if (this.mergedBox != null) {
            this.removeLines();
            var greenMat = new BABYLON.StandardMaterial("greenmat", this.scene);
            greenMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
            greenMat.alpha = 0.1;

            ///////////////////Create room box without bottom////////////////////////
            var tmp = BABYLON.MeshBuilder.CreateBox("tempBox", { depth: this.roomLength, width: this.roomWidth, height: this.roomDepth }, this.scene); // default box
            tmp.isPickable = false;
            
            orgVertexData = BABYLON.VertexData.ExtractFromMesh( tmp, true, true);
            tmp.dispose()
		    var indices       = orgVertexData.indices;
            var positions     = orgVertexData.positions;

            indices.splice(30, 6)
            var roomBox = new BABYLON.Mesh("RoomBox", this.scene);
		    var	vertexData = new BABYLON.VertexData();
			vertexData.indices		= indices;
			vertexData.positions	= orgVertexData.positions;
			vertexData.normals	    = orgVertexData.normals;
			vertexData.uvs	        = orgVertexData.uvs;
		    vertexData.applyToMesh(roomBox);
		    //roomBox.isPickable = false;
		    //roomBox.visibility =false;
		    ////////////////////////////////////////////////////////////////////////        
            /////////////////////Create punch plane/////////////////////////////////
            var rectangle =[], hole = [];
        
            rectangle.push({ x: positions[60], y: positions[61], z: positions[62] });
            rectangle.push({ x: positions[63], y: positions[64], z: positions[65] });
            rectangle.push({ x: positions[66], y: positions[67], z: positions[68] });
            rectangle.push({ x: positions[69], y: positions[70], z: positions[71] });        
		    var polygon = BABYLON.MeshBuilder.CreatePolygon("polygon", {shape:rectangle, holes:[this.hole], sideOrientation: BABYLON.Mesh.BACKSIDE }, this.scene);
		    
		    
		    polygon.isPickable = false;
		    polygon.position.y -=this.roomDepth/2;

            var newMesh = BABYLON.Mesh.MergeMeshes([roomBox, polygon, this.flipOrient(this.mergedBox)])
            this.scene.removeMesh(roomBox)
            this.scene.removeMesh(polygon)
            roomBox.dispose();
            polygon.dispose();
            newMesh.isPickable = false;
            newMesh.material = greenMat;
            const obj = BABYLON.OBJExport.OBJ([newMesh]);
            download("air.obj", obj);
            var text="" ;
            orgVertexData = BABYLON.VertexData.ExtractFromMesh(newMesh, true, true);
        
            /*
            var indices = orgVertexData.indices;
            var positions = orgVertexData.positions;
            for (let i = 0; i < positions.length; i+=3)
                    text += (i/3 + 1).toString() + " " + positions[i] + " " + positions[i+1] + " " + positions[i+2] + "\n";
            for (let i = 0; i < indices.length; i+=3)
                    text += (i/3 + 1).toString() + " 2 2 0 1 " + (indices[i]+1) + " " + (indices[i+1]+1) + " " + (indices[i+2]+1) + "\n";
            download("t.txt",text);
            */
            
            var vertexDataTest = HXT_Convert(newMesh);
            //Create a custom mesh 
            var tetrahedron = new BABYLON.Mesh("tetra", scene);

            vertexDataTest.applyToMesh(tetrahedron);

            //tetrahedron.material = alphamat;
            tetrahedron.enableEdgesRendering();
            tetrahedron.edgesColor = new BABYLON.Color4(0, 1, 0, 1);
            tetrahedron.material = greenMat;
            
            this.hxtMesh = tetrahedron;
        } else {
            alert("Make speaker mesh first.");
        }

    },
    removeLines: function () {
        if (this.lines.length > 0)
            for (let i = 0; i < this.lines.length; i++)
                this.lines[i].dispose();
    },
    subtractMouth: function (wgParams = this.wgOptions, sfParams = this.sfOptions) {
        if (this.Mainbox == null || this.Mainbox.visibility == false) {
            alert("Create Main box first");
            return;
        }
        orgVertexData = BABYLON.VertexData.ExtractFromMesh( this.Mainbox, true, true);
		var indices     = orgVertexData.indices;
		var positions   = orgVertexData.positions;

        indices.splice(0, 6)
        indices.splice(24, 6)
        this.hole.push({ x: positions[60], y: positions[61], z: positions[62] });
        this.hole.push({ x: positions[63], y: positions[64], z: positions[65] });
        this.hole.push({ x: positions[66], y: positions[67], z: positions[68] });
        this.hole.push({ x: positions[69], y: positions[70], z: positions[71] });
        var tetrahedron = new BABYLON.Mesh("tetra", this.scene);
		var	vertexData = new BABYLON.VertexData();
			vertexData.indices		= indices;
			vertexData.positions	= positions;
			vertexData.normals	    = orgVertexData.normals;
			vertexData.uvs	    = orgVertexData.uvs;
		vertexData.applyToMesh(tetrahedron);
		tetrahedron.position = this.Mainbox.position;
		//////////////////////Create front mesh with hole /////////////
		var rectangle =[], mouth = [],thro=[];
		var sfMouthPoints = this.superformulaCurve(sfParams.HRadius / 1000, sfParams.VRadius / 1000, sfParams.m, sfParams.n1, sfParams.n2, sfParams.n3, sfParams.resolution, 0);
        for (let i = 0; i < sfMouthPoints.length; i++)
            mouth.push({ x: sfMouthPoints[i].x, y: 0, z: sfMouthPoints[i].y });
        
        rectangle.push({ x: positions[9], y: 0, z: positions[10] })
        rectangle.push({ x: positions[6], y: 0, z: positions[7] })
        rectangle.push({ x: positions[3], y: 0, z: positions[4] })            
        rectangle.push({ x: positions[0], y: 0, z: positions[1]})
        
		var polygon = BABYLON.MeshBuilder.CreatePolygon("polygon", {shape:rectangle, holes:[mouth], sideOrientation: BABYLON.Mesh.FRONTSIDE }, this.scene);
        polygon.position.x = this.Mainbox.position.x;
        polygon.position.y = this.Mainbox.position.y;
        polygon.position.z = this.Mainbox.position.z + this.boxDepth /2;
        polygon.rotation.x = Math.PI /2;
        polygon.isPickable = false;
        ////////////////////////////////////////////////////////////////////
        //////////////////Create throus mesh//////////////////////////////////
        var throatZlevel = this.wgOptions.len / 1000;
        var sfEntryPoint = this.superformulaCurve(wgParams.r / 1000, wgParams.r / 1000, 4, 2, 2, 2, sfParams.resolution, -throatZlevel)

        for (let i = 0; i < sfEntryPoint.length; i++)
            thro.push({ x: sfEntryPoint[i].x, y: 0, z: sfEntryPoint[i].y });

        var polygon2 = BABYLON.MeshBuilder.CreatePolygon("polygon2", { shape: thro, sideOrientation:  BABYLON.Mesh.FRONTSIDE}, this.scene);
        polygon2.parent = this.curveHolder
        polygon2.rotation.x = Math.PI / 2
        polygon2.position.z = -wgParams.len / 1000;
        ////////////////////////////////////////////////////
        tetrahedron.parent = null;
        polygon.parent = null;
        var v1 = BABYLON.VertexData.ExtractFromMesh( tetrahedron, true, true);
        var v2 = BABYLON.VertexData.ExtractFromMesh( polygon, true, true);
        
        var allPath = [];
        for (var i = 0; i < sfParams.resolution; i++) {
            var wgHPoints = [];
            wgHPoints = this.wgPoints(wgParams.len / 1000, wgParams.s, wgParams.q, wgParams.n, wgParams.r / 1000, wgParams.tau,
                this.spaceAlpha(wgParams.caH, wgParams.caV, Math.PI * 2 / sfParams.resolution * i), wgParams.resolution,
                Math.sqrt(sfMouthPoints[i].x * sfMouthPoints[i].x + sfMouthPoints[i].y * sfMouthPoints[i].y),
                wgParams.FixedPart,
                Math.PI * 2 / sfParams.resolution * i);

            allPath.push(wgHPoints);
        }

        var horn = BABYLON.MeshBuilder.CreateRibbon("ribbon", { pathArray: allPath, closeArray: true, closePath: false,sideOrientation: BABYLON.Mesh.FRONTSIDE }, this.scene);
        horn.parent = this.curveHolder

        
        var newMesh = BABYLON.Mesh.MergeMeshes([tetrahedron, polygon,polygon2,horn])
        newMesh.isPickable = false;
        
        if (this.mergedBox != null) this.eraseAll();
        this.mergedBox = newMesh;
        tetrahedron.dispose();
        polygon.dispose();
        polygon2.dispose();
        horn.dispose();
        
        var redMat = new BABYLON.StandardMaterial("redmat", this.scene);
        redMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        redMat.alpha = 0.7;
        this.mergedBox.material =  redMat;
        this.Mainbox.visibility = false;
        this.horn.visibility = false;
        this.removeLines();
        const obj = BABYLON.OBJExport.OBJ([this.mergedBox]);
        //var objURL = BABYLON.Tools.FileAsURL(obj);
        //console.log(objURL)
        download("speaker.obj", obj);
    },
    
    subtractMouth2: function (wgParams = this.wgOptions, sfParams = this.sfOptions) {
        if (this.Mainbox == null || this.Mainbox.visibility == false) {
            alert("Create Main box first");
            return;
        }
        orgVertexData = BABYLON.VertexData.ExtractFromMesh( this.Mainbox, true, true);
		var indices     = orgVertexData.indices;
		var positions   = orgVertexData.positions;
       
        indices.splice(0, 6)
        indices.splice(24, 6)
        var tetrahedron = new BABYLON.Mesh("tetra", this.scene);
		var	vertexData = new BABYLON.VertexData();
			vertexData.indices		= indices;
			vertexData.positions	= positions;
			vertexData.normals	    = orgVertexData.normals;
			vertexData.uvs	    = orgVertexData.uvs;
		vertexData.applyToMesh(tetrahedron);
		tetrahedron.position = this.Mainbox.position;
		//////////////////////Create front mesh with hole /////////////
		var rectangle =[], mouth = [],thro=[];
		var sfMouthPoints = this.superformulaCurve(sfParams.HRadius / 1000, sfParams.VRadius / 1000, sfParams.m, sfParams.n1, sfParams.n2, sfParams.n3, sfParams.resolution, 0);
        for (let i = 0; i < sfMouthPoints.length; i++)
            mouth.push({ x: sfMouthPoints[i].x, y: 0, z: sfMouthPoints[i].y });
        
        rectangle.push({ x: positions[9], y: 0, z: positions[10] })
        rectangle.push({ x: positions[6], y: 0, z: positions[7] })
        rectangle.push({ x: positions[3], y: 0, z: positions[4] })            
        rectangle.push({ x: positions[0], y: 0, z: positions[1]})
        
		var polygon = BABYLON.MeshBuilder.CreatePolygon("polygon", {shape:rectangle, holes:[mouth], sideOrientation: BABYLON.Mesh.FRONTSIDE }, this.scene);
        polygon.position.x = this.Mainbox.position.x;
        polygon.position.y = this.Mainbox.position.y;
        polygon.position.z = this.Mainbox.position.z + this.boxDepth /2;
        polygon.rotation.x = Math.PI /2;
        polygon.isPickable = false;
        ////////////////////////////////////////////////////////////////////
        //////////////////Create throus mesh//////////////////////////////////
        var throatZlevel = this.wgOptions.len / 1000;
        var sfEntryPoint = this.superformulaCurve(wgParams.r / 1000, wgParams.r / 1000, 4, 2, 2, 2, sfParams.resolution, -throatZlevel)

        for (let i = 0; i < sfEntryPoint.length; i++)
            thro.push({ x: sfEntryPoint[i].x, y: 0, z: sfEntryPoint[i].y });

        var polygon2 = BABYLON.MeshBuilder.CreatePolygon("polygon2", { shape: thro, sideOrientation:  BABYLON.Mesh.FRONTSIDE}, this.scene);
        polygon2.parent = this.curveHolder
        polygon2.rotation.x = Math.PI / 2
        polygon2.position.z = -wgParams.len / 1000;
        ////////////////////////////////////////////////////
        tetrahedron.parent = null;
        polygon.parent = null;
        var v1 = BABYLON.VertexData.ExtractFromMesh( tetrahedron, true, true);
        var v2 = BABYLON.VertexData.ExtractFromMesh( polygon, true, true);
        
        var allPath = [];
        for (var i = 0; i < sfParams.resolution; i++) {
            var wgHPoints = [];
            wgHPoints = this.wgPoints(wgParams.len / 1000, wgParams.s, wgParams.q, wgParams.n, wgParams.r / 1000, wgParams.tau,
                this.spaceAlpha(wgParams.caH, wgParams.caV, Math.PI * 2 / sfParams.resolution * i), wgParams.resolution,
                Math.sqrt(sfMouthPoints[i].x * sfMouthPoints[i].x + sfMouthPoints[i].y * sfMouthPoints[i].y),
                wgParams.FixedPart,
                Math.PI * 2 / sfParams.resolution * i);

            allPath.push(wgHPoints);
        }

        var horn = BABYLON.MeshBuilder.CreateRibbon("ribbon", { pathArray: allPath, closeArray: true, closePath: false,sideOrientation: BABYLON.Mesh.FRONTSIDE }, this.scene);
        horn.parent = this.curveHolder

        
        var newMesh = BABYLON.Mesh.MergeMeshes([tetrahedron, polygon,polygon2,horn])
        newMesh.isPickable = false;
        
        if (this.mergedBox != null) this.eraseAll();
        this.mergedBox = newMesh;
        tetrahedron.dispose();
        polygon.dispose();
        polygon2.dispose();
        horn.dispose();
        
        var redMat = new BABYLON.StandardMaterial("redmat", this.scene);
        redMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        redMat.alpha = 0.7;
        this.mergedBox.material =  redMat;
        this.Mainbox.visibility = false;
        this.horn.visibility = false;
        this.removeLines();
        const obj = BABYLON.OBJExport.OBJ([this.mergedBox]);
        //var objURL = BABYLON.Tools.FileAsURL(obj);
       // console.log(objURL)
        download("speaker.obj", obj);
    },
    wgCheck: function (mouthFace) {
        var minx = 0, miny = 0, maxx = 0, maxy = 0
        for (let i = 0; i < mouthFace.length; i++) {
            if (mouthFace[i].x < minx) minx = mouthFace[i].x;
            if (mouthFace[i].y < miny) miny = mouthFace[i].y;
            if (mouthFace[i].x > maxx) maxx = mouthFace[i].x;
            if (mouthFace[i].y > maxy) maxy = mouthFace[i].y;
            var l1 = maxx - minx;
            var l2 = maxy - miny;
            var l3 = Math.sqrt(l1 * l1 + l2 * l2)
            if (this.checkValid(
                this.boxWidth, this.boxHeight,
                this.curveHolder.position.x, this.curveHolder.position.y,
                l3, l3)) {
                this.datOptions.lowBoundboxWidth = l3
                this.datOptions.lowBoundboxHeight = l3
            }
            else
                return false;
        }
        return true;
    },
    exportObj: function () {
        if (this.mergedBox) {
            this.mergedBox.parent = null
            const obj = BABYLON.OBJExport.OBJ([this.mergedBox]);
            var objURL = BABYLON.Tools.FileAsURL(obj);
            console.log(objURL)
            download("speaker.obj", obj);
        } else {
            alert("Make speaker mesh first.");
        }


    },
    wgCreatePoints: function (wgParams = this.wgOptions, sfParams = this.sfOptions) {

        var poly = []
        var sfMouthPoints = this.superformulaCurve(sfParams.HRadius / 1000, sfParams.VRadius / 1000, sfParams.m, sfParams.n1, sfParams.n2, sfParams.n3, sfParams.resolution, 0);
        sfMouthPoints.push(sfMouthPoints[0]);
        var sfMouthLine = BABYLON.Mesh.CreateLines("sf", sfMouthPoints, this.scene);
        sfMouthLine.color = new BABYLON.Color3(0.5, 1, 0.5);
        if (this.wgCheck(sfMouthPoints) == false) return false;

        this.removeLines();

        if (this.horn != null)
            this.horn.dispose();

        ////////////////////////////////////////////////////////////////
        var throatZlevel = wgParams.len / 1000;
        var sfEntryPoint = this.superformulaCurve(wgParams.r / 1000, wgParams.r / 1000, 4, 2, 2, 2, sfParams.resolution, -throatZlevel)

        var allPath = [];
        for (var i = 0; i < sfParams.resolution; i++) {
            var wgHPoints = [];

            wgHPoints = this.wgPoints(wgParams.len / 1000, wgParams.s, wgParams.q, wgParams.n, wgParams.r / 1000, wgParams.tau,
                this.spaceAlpha(wgParams.caH, wgParams.caV, Math.PI * 2 / sfParams.resolution * i), wgParams.resolution,
                Math.sqrt(sfMouthPoints[i].x * sfMouthPoints[i].x + sfMouthPoints[i].y * sfMouthPoints[i].y),
                wgParams.FixedPart,
                Math.PI * 2 / sfParams.resolution * i);

            allPath.push(wgHPoints);
        }

        var mat = new BABYLON.StandardMaterial("mat1", this.scene);
        mat.alpha = 1;
        mat.diffuseColor = new BABYLON.Color3(0, 0, 1.0);
        mat.emissiveColor = new BABYLON.Color3.Black();
        mat.backFaceCulling = false;
        var horn = BABYLON.MeshBuilder.CreateRibbon("ribbon", { pathArray: allPath, closeArray: true, closePath: false,sideOrientation:1 }, this.scene);
        horn.material = mat;
        horn.isPickable = false;
        this.horn = horn;
        this.horn.parent = this.curveHolder;

        this.lines.push(sfMouthLine)
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].isPickable = false;
            this.lines[i].parent = this.curveHolder;
        }
        this.curveHolder.parent = this.Mainbox;
        return true;
    },

    spaceAlpha: function (h, v, ang) {
        return Math.sqrt(Math.pow(h * Math.cos(ang), 2.0) + Math.pow(v * Math.sin(ang), 2.0));
    },
    wgPoints: function (len, s, q, n, r, tau, alpha, resolution, maxY, fixedPart, beta) {
        //len: 120.0, s: 0.87, q: 0.998, n: 4.34, r: 18.0,
        //tau: 14.5, caH: 100.0, caV: 75.0, resolution: 720,
        // ConicSectionPart: 0.6, FixedPart: 0.2, CornerRadius: 30, StretchExp: 1.5
        var step = len / resolution;

        var wgPoints = [];

        var k1 = r * r;
        var k2 = 2.0 * r * Math.tan(BABYLON.Tools.ToRadians(0.5 * tau));
        var k3 = Math.pow(Math.tan(BABYLON.Tools.ToRadians(0.5 * alpha)), 2.00);


        var x = resolution * step;
        var os1 = Math.sqrt(k1 + k2 * x + k3 * x * x);
        var se1 = len * s / q * (1.0 - (1.0 - (q * x / len) ** n) ** (1 / n));
        var wg1 = os1 + se1;
        //var wg2 = new BABYLON.Vector3(wg1, 0, x - len);
        var zmax = wg1;// (maxY - r) / (wg1 - r) ;
        //wgPoints.push(wg2);

        for (var i = 0; i <= resolution; i++) {
            var x = i * step;
            var os1 = Math.sqrt(k1 + k2 * x + k3 * x * x);
            var se1 = len * s / q * (1.0 - (1.0 - (q * x / len) ** n) ** (1 / n));
            var wg1 = os1 + se1;

            if (x >= fixedPart * len) {
                // console.log(Math.pow((x-fixedPart*len) / (len - fixedPart*len),3.0),(rb - maxY ) )
                wg1 += Math.pow((x - fixedPart * len) / (len - fixedPart * len), 2) * (maxY - zmax)
                //console.log(wg1)
            }

            var wg2 = new BABYLON.Vector3(wg1 * Math.cos(beta), wg1 * Math.sin(beta), x - len);

            //var wg2 = new BABYLON.Vector3( (wg1 - r)*ratio + r, 0, x - len);


            wgPoints.push(wg2);
        }
        return wgPoints;
    },

    superformulaCurve: function (a, b, m, n1, n2, n3, res, z) {
        var dt = 2 * Math.PI / res;

        var sfpoints = [];

        for (var i = 0; i < res; i++) {

            var u, t, t1, t2, r, x, y;

            u = m * (i * dt - Math.PI) / 4;
            t1 = Math.abs(Math.cos(u) / a) ** n2;
            t2 = Math.abs(Math.sin(u) / b) ** n3;
            r = Math.abs(t1 + t2) ** (-1 / n1);

            if (Math.abs(t) === 0) {
                sfpoints.push(new BABYLON.Vector3(0, z, 0));
            } else {
                x = r * Math.cos(i * dt);
                y = r * Math.sin(i * dt);
                sfpoints.push(new BABYLON.Vector3(x, y, z));
            }

        };

        return sfpoints;

    }

}
