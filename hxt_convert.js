HXT_OPTIMIZE = function (vertexArray,indexArray){
    var vSize = vertexArray.length;
    var iSize = indexArray.length;
    var tableCvt = [];
    var removeIndex = [];
    for (let i = 0; i < vSize/3; i++){
        tableCvt.push([0,i,i]);
    }
    
    var e = Math.pow(10,-15);
    var sub = 0;
    for (let i = 0; i < vSize; i+=3) {
        var x = vertexArray[i];
        var y = vertexArray[i+1];
        var z = vertexArray[i+2];
        for (let j = i + 3; j < vSize; j+=3) {
            if(Math.abs(x -vertexArray[j]) < e  && Math.abs(y - vertexArray[j+1])<e && Math.abs(z - vertexArray[j+2])<e){
                if(tableCvt[j/3][0] == 1) continue;
                tableCvt[j/3][1] = 0;
                tableCvt[j/3][2] = i/3;
                tableCvt[j/3][0] = 1;
                //removeIndex.push([j/3,i/3]);
            }
        }
        if(tableCvt[i/3][0] == 1) sub++;
        tableCvt[i/3][1] = sub;
    }
    
    for (let i = 0; i < iSize; i++) {
        if (tableCvt[indexArray[i]][0] == 1) indexArray[i] = tableCvt[indexArray[i]][2];
    }
    for (let i = 0; i < iSize; i++) {
        indexArray[i] -= tableCvt[indexArray[i]][1];
    }
    for (let i = vSize / 3 - 1; i >= 0; i--) {
        if (tableCvt[i][0] == 1) vertexArray.splice(i * 3, 3);
    }
    var text = "";
    text = "$MeshFormat\n2.2 0 8\n$EndMeshFormat\n$Nodes\n";
    text += vertexArray.length/3 + "\n";
    for (let i = 0; i < vertexArray.length; i += 3)
        text += (i / 3 + 1).toString() + " " + vertexArray[i] + " " + vertexArray[i + 1] + " " + vertexArray[i + 2] + "\n";
    text += "$EndNodes\n$Elements\n";
    text += indexArray.length/3 + "\n";
    for (let i = 0; i < indexArray.length; i += 3)
        text += (i / 3 + 1).toString() + " 2 2 0 1 " + (indexArray[i] + 1) + " " + (indexArray[i + 1] + 1) + " " + (indexArray[i + 2] + 1) + "\n";
    text += "$EndElements";
    //download("t.txt", text);

           
    //console.log(removeIndex , vertexArray.length)
}

HXT_Convert = function (mesh) {

    var orgVertexData;
    var source;

    if (mesh) {
        if (mesh.isAnInstance) {
            Logger.Warn("Cannot operate on instance meshes.");
            return null;
        }

        const wm = mesh.computeWorldMatrix(true);

        orgVertexData = BABYLON.VertexData.ExtractFromMesh(mesh, true, true);
        orgVertexData.transform(wm);

        var indices = orgVertexData.indices;
        var positions = orgVertexData.positions;
        HXT_OPTIMIZE(positions,indices);
        console.log(positions)

        ////////////////////parameter parsing////////////////////////////
       // console.table(positions);console.table(indices)
        //console.

        var positionDblArray = new Float64Array(positions)
        var indexIntArray = new Uint32Array(indices)
        //console.log(positionDblArray);console.log(indexIntArray);
        ///////////////// Make buffer for vertices and indices /////////////////////////////////////////////////////
        var positionBuffer = Module._malloc(positionDblArray.length * positionDblArray.BYTES_PER_ELEMENT);
        var indexBuffer = Module._malloc(indexIntArray.length * indexIntArray.BYTES_PER_ELEMENT);

        Module.HEAPF64.set(positionDblArray, positionBuffer >> 3);
        Module.HEAP32.set(indexIntArray, indexBuffer >> 2);

        ////////////////////////////prepare to retrieve variables /////////////////////////////////

        var newVerticesCountBuffer = Module._malloc(4);
        var newTetCountBuffer = Module._malloc(4);
        var TetBuffer = Module._malloc(positions.length * 4 * 20);
        var newVerticesBuffer = Module._malloc(positions.length * 8 * 2);

        ////////////////////////////// Call HXT function ///////////////////////////////////////////
        //uint32_t num, double* vertices,uint32_t * newVerticesNum,double * newVertices, uint32_t * newTetNum, uint32_t * newTetra

        //int EMSCRIPTEN_KEEPALIVE web_hxt_tetMesh(
        //uint32_t npos, double pos[], uint64_t nind, uint32_t indices[],
        //uint32_t *nhpos, double hpos[], uint64_t *ntet, uint32_t tets[]) {

        var result = Module.ccall(
            'web_hxt_tetMesh',	// name of C function 
            'number',	// return type
            ['number', 'number', 'number', 'number',
                'number', 'number', 'number', 'number'],	// argument types
            [
                positions.length, positionBuffer, indices.length, indexBuffer,
                newVerticesCountBuffer, newVerticesBuffer, newTetCountBuffer, TetBuffer
            ]	// arguments
        );
        console.log("hxt ends");
        ///////////////////////////////Parse result //////////////////////////////////////////////

        var newIndices = [];
        var newPositions = [];

        var newVCount = getValue(newVerticesCountBuffer, 'i32');
        var newTCount = getValue(newTetCountBuffer, 'i32');

        //////// make new vertices /////////////////
        for (let v = 0; v < newVCount * 3;) {
            newPositions.push(Module.HEAPF64[newVerticesBuffer / Float64Array.BYTES_PER_ELEMENT + v]); v++
        }

        // nbfaces = 4
        // face: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]]
        // for (f = 0; f < nbfaces; f++) {
        //for (i = 0; i < data.face[f].length - 2; i++) {
        //    indices.push(data.face[f][0], data.face[f][i + 2], data.face[f][i + 1]);
        //	}
        //}
        //[0,1,2],[0,2,3],[0,3,1],[1,3,2]

        // make new indices

        for (let f = 0; f < newTCount * 4;) {
            var tetraInx0 = Module.HEAP32[TetBuffer / Uint32Array.BYTES_PER_ELEMENT + f]; f++;
            var tetraInx1 = Module.HEAP32[TetBuffer / Uint32Array.BYTES_PER_ELEMENT + f]; f++;
            var tetraInx2 = Module.HEAP32[TetBuffer / Uint32Array.BYTES_PER_ELEMENT + f]; f++;
            var tetraInx3 = Module.HEAP32[TetBuffer / Uint32Array.BYTES_PER_ELEMENT + f]; f++;
            //console.log(tetraInx0)
            //tetrahedra.push([tetraInx0,tetraInx2,tetraInx2,tetraInx3]);
            newIndices.push(tetraInx0, tetraInx1, tetraInx2);
            newIndices.push(tetraInx0, tetraInx2, tetraInx3);
            newIndices.push(tetraInx0, tetraInx3, tetraInx1);
            newIndices.push(tetraInx1, tetraInx3, tetraInx2);
        }

        //console.log(tetrahedra);

        ///////////////////////////////free buffers////////////////////////////////////////////////
        Module._free(positionBuffer);
        Module._free(indexBuffer);
        Module._free(newVerticesCountBuffer);
        Module._free(newTetCountBuffer);
        Module._free(newVerticesBuffer);
        Module._free(TetBuffer);

        ///////////////////////////make new vertex/////////////////////////////////////////////
        vertexData = new BABYLON.VertexData();
        vertexData.indices = newIndices;
        vertexData.positions = newPositions;

        return vertexData;
    }

    return null;

}
