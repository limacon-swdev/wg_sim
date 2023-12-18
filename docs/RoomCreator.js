RoomCreator = function(canvasId) {
    
    this.canvas = document.getElementById(canvasId);
    this.engine= new BABYLON.Engine(this.canvas, true);
    this.engine.enableOfflineSupport=true;

    //Game Properties
    this.mainSceneManager=new MainSceneManager(this);
    this.currentScene = this.mainSceneManager.createScene(this.engine);
    
    
    // The render function
    this.engine.runRenderLoop( ()=> {
        this.currentScene.render();
    });

    // Resize the babylon engine when the window is resized
    window.addEventListener("resize",  ()=> {
        this.engine.resize();
    },false);
      
};

RoomCreator.prototype = {
    fuc1 : function(){
      
    },

}