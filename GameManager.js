GameManager = function(canvasId) {
    
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

GameManager.prototype = {
    fuc1 : function(){
      
    },

}
function download(filename, text) {
    var pom = document.createElement('a');
    document.body.appendChild(pom);
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
      var event = document.createEvent('MouseEvents');
      event.initEvent('click', true, true);
      pom.dispatchEvent(event);
    }
    else {
      pom.click();
    }
    document.body.removeChild(pom);
  }