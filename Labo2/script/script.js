
class Plot{
  constructor(divId){
    this.divId = divId;
    this.function = document.getElementById('eq').value;
    this.options = {
      target: '#'+this.divId,
      width: 800,
      height: 500,
      data: [{
        fn: '',
        sampler: 'builtIn',  // this will make function-plot use the evaluator of math.js
        graphType: 'polyline',
        title: 'f(x)'
      }],
      plugins: [
        functionPlot.plugins.zoomBox()
      ]
    };
    this.instance = functionPlot(this.options);
  }

  setAlgorithme(algorithme){
    this.algorithme = algorithme;
    this._reset();
  }

  _reset(){
    //TODO
    this.step = 0;
    $('#result').html('');
    //Ne pas vider data pour éviter des problèmes d'affichage
  }

  redraw(){
    this._reset();
    this.syncOptions();
    this.draw();
  }

  draw(){
    if(this.function != document.getElementById('eq').value){
      this._reset();
      this.algorithme.reset();
    }

    this.function = document.getElementById('eq').value;
    this.options.data = this.options.data.slice(0,1);
    this.options.data[0].fn = this.function;
    let functions = this.algorithme.draw();
    this.options.data = this.options.data.concat(functions);

    $('g .content').html('');
    this.instance.draw();
  }

  getFunction(){
    return this.function;
  }

  getValue(x){
    var scope = {
        x: x
    };
    return math.eval(this.function, scope);
  }

  getX1(){
    return parseInt($('#x1').val());
  }

  getX2(){
    return parseInt($('#x2').val());
  }

  //Methode to implement
  nextStep(){
    this.algorithme.nextStep();
    this.draw();
  }

  previousStep(){
    this.algorithme.previousStep();
    this.draw();
  }
}

class Algorithme{
  constructor(plot, resultArea){
    if (this.constructor === Algorithme) {
      throw new Error("Can't instantiate abstract class!");
    }
    this.plot = plot;
    this.resultArea = resultArea;
    this.data = [];
    this.step = 0;
  }

  reset(){
    this.data = [];
    this.step = 0;
  }

  getData(){
    return this.data.slice(0,this.step);
  }

  _displayResult(content){
    if(!Array.isArray(content)){
      this.resultArea.html(content);
    }else{
      let tableResults = `<table class="table table-hover"><thead><tr><th>Itération</th><th>x</th><th>f(x)</th></tr></thead><tbody>`;
      let i=0;
      tableResults = tableResults.concat(content.map((d)=>{return '<tr><td><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mi>x</mi><mn>'+(i++)+'</mn></msub></math></td><td>'+d.join('</td><td>')+'</td></tr>'}).join(''));
      tableResults = tableResults.concat(`</tbody></table>`);
      this.resultArea.html(tableResults);
      console.log(tableResults);
    }
  }

  previousStep(){
    if(this.step > 0){
      this.step--;
    }
  }

	/**
	 * Epsilon = 1e-6
	 */
	static isEqualsDefaultE(a, b)
	{
    return Algorithme.isEquals(a, b, 1e-6);
	}

  static isEquals(a, b, epsilon)
	{
    if (a != 0 && b != 0)
    {
      return Math.abs((a - b) / a) <= epsilon;
    }
    else
    {
      return Math.abs(a - b) <= epsilon;
    }
	}

  //Methode to implement
  nextStep(){
    throw new Error("Not implemented");
  }

  draw(){
    throw new Error("Not implemented");
  }
}

class Dichotomy extends Algorithme{
  constructor(plot, resultArea){
    super(plot, resultArea);
    this.x1 = this.plot.getX1();
    this.x2 = this.plot.getX2();
    this.zeroFounded = false;
    if(this._evaluateBorneSigneEqual()){
      this._displayResult('<div class="alert alert-danger" role="alert">Erreur, valeurs de la fonction aux bornes du même signes!</div>')
      console.log("Erreur, bornes du même signes");
    }
  }

  nextStep(){
    this.step++;
    if(this.step > this.data.length && !this.zeroFounded){
      //Calcul de la prochaine étape et ajout de celle-ci dans le tableau data
      if(this._evaluateBorneSigneEqual()){
        this._displayResult('<div class="alert alert-danger" role="alert">Erreur, valeurs de la fonction aux bornes du même signes!</div>')
        console.log("Erreur, bornes du même signes");
      }else{
        let middle = (this.x1 + this.x2)/2;
        let value = this.plot.getValue(middle);
        if(Dichotomy._sameSign(this.plot.getValue(this.x1), value)){
          this.x1 = middle;
        }else{
          this.x2 = middle;
        }

        this.data.push([middle, value]);

        //TODO update to test with Epsilon
        if(Algorithme.isEquals(value),0){
          this.zeroFounded = true;
        }
      }
    }
  }

  draw(){
    let data = this.getData();
    this._displayResult(data);

    if(data.length==1){
      //Requirement of function-plot, mimimum 2 couple of values
      //data.push(data[0]);
    }
    return [{
        points: data,
        attr:{'stroke-width': 3},
        fnType: 'points',
        color: 'red',
        graphType: 'scatter'
    }];
  }

  _evaluateBorneSigneEqual(){
    return Dichotomy._sameSign(this.plot.getValue(this.x1), this.plot.getValue(this.x2));
  }

  static _sameSign(x1, x2){
    return (x1>0) === (x2>0);
  }
}

class Tangent extends Algorithme{
  constructor(plot, resultArea){
    super(plot, resultArea);
    this.x = this.plot.getX1();
    this.zeroFounded = false;
    try {
      this._derivative(this.x);
    }catch(err){
      console.log("Erreur, dérivée de la fonction = 0");
      this._displayResult('<div class="alert alert-danger" role="alert">Erreur, dérivé de la fonction = 0!</div>');
    }
  }

  nextStep(){
    this.step++;
    if(this.step > this.data.length && !this.zeroFounded){
      //Calcul de la prochaine étape et ajout de celle-ci dans le tableau data
      try {
        //Calcul du nouveau x -> ax+b=0 avec a=derivative et b=y(x)
        let a = this._derivative(this.x);
        let y = this.plot.getValue(this.x);
        let b = y - a*this.x;
        let x = -b/a;
        let func = a+' * x + '+ b;

        this.data.push([func,this.x,y]);
        this.x = x;

        //TODO update to test with Epsilon
        if(Algorithme.isEquals(this.plot.getValue(this.x),0)){
          this.zeroFounded = true;
        }
      }catch(err){
        console.log("Erreur, dérivée de la fonction = 0");
        this._displayResult('<div class="alert alert-danger" role="alert">Erreur, dérivé de la fonction = 0!</div>');
      }
    }
  }

  draw(){
    let data = this.getData();
    let graph = [];
    let color = 'grey';

    this._displayResult(data.map((d)=>{return [d[1],d[2]]})); // Map pour retourner que les indice 1=x et 2=f(x) du tableau

    data.forEach(function(element, index) {
      if(data.length <= index+1){
        color = 'red';
      }
      console.log(element);
      graph.push({
        fn: element[0],
        sampler: 'builtIn',  // this will make function-plot use the evaluator of math.js
        graphType: 'polyline',
        color: color
      },{
        vector: [0, element[2]],
        offset: [element[1], 0],
        graphType: 'polyline',
        fnType: 'vector',
        color: color
      });
    });
    return graph;
  }

  _derivative(x){
    let value = math.derivative(this.plot.getFunction(), 'x').eval({x: x});
    if(value===0){
      throw new Error("Derivative = 0");
    }
    return value;
  }
}

class FixedPoint extends Algorithme{
  constructor(plot, resultArea){
    super(plot, resultArea);
    this.lambda = 1;
    this.gOfX = this.lambda+"*"+plot.getFunction()+"+ x";
    this.x = plot.getX1();
    this.step = 0;
    this.verif = false;
  }

  nextStep(){
    let savedX = this.x;
    this.step++;
    for(let i=0;i<Math.max(this.step,4);i++){ //Calcul of the four first elements
      if(this.step < 5 || this.step > this.data.length && !this.zeroFounded){
        //Calcul de la prochaine étape et ajout de celle-ci dans le tableau data
        let xi = this._evalG(this.x);
        this.data.push([this.x,xi]);
        this.x = xi;
      }
    }

    if(this.verif === false && Math.abs(this.data[1][0]-this.data[1][1])<Math.abs(this.data[3][0]-this.data[3][1])){
      this.step = 0;
      this.lambda *= -1;
      this.data = [];
      this.gOfX = this.lambda+"*"+plot.getFunction()+" + x";
      this.x = savedX;
      this.verif = true;
      this.nextStep();
      this.verif = false;
    }

    if(Algorithme.isEquals(savedX, this.x)){
      this.zeroFounded = true;
    }
  }

  _evalG(x){
    return math.eval(this.gOfX, {'x':x});
  }

  draw(){
    let data = this.getData();

    //TODO
    this._displayResult(data.map((d)=>{return [d[0],d[1]-d[0]]}));

    let functions = [{
      fn: 'x',
      sampler: 'builtIn',
      graphType: 'polyline',
      title: 'x'
    },{
      fn: this.gOfX,
      sampler: 'builtIn',
      graphType: 'polyline',
      title: 'g(x)'
    }];

    let vectors = [];
    for(let i=0;i<data.length;i++){
      let offset = 0;
      if(i>0){
        offset = data[i][0];
        //Ajout 'une ligne supplémentaire'
        functions.push({
          vector: [data[i][0]-data[i-1][0], 0],
          offset: [data[i-1][0], data[i][0]],
          graphType: 'polyline',
          fnType: 'vector',
          color: 'red'
        });
      }
      functions.push({
        vector: [0, data[i][1]-offset],
        offset: [data[i][0], offset],
        graphType: 'polyline',
        fnType: 'vector',
        color: 'red'
      });
    }
    console.log(functions);
    return functions;
  }
}

/*
function draw() {
  try {
    functionPlot({
      target: '#canvas',
      data: [{
        fn: document.getElementById('eq').value,
        sampler: 'builtIn',  // this will make function-plot use the evaluator of math.js
        graphType: 'polyline'
      },{
        points: [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
          [1, 1]
        ],
        fnType: 'points',
        graphType: 'polyline' //scatter -> pour des points
      },{
        vector: [2, 1],
        offset: [1, 2],
        graphType: 'polyline',
        fnType: 'vector'
      }]
    });
  }
  catch (err) {
    console.log(err);
    alert(err);
  }
}*/


let plot = new Plot('canvas');

$(document).ready(function(){
  //Sliders
  /*$("#nbIteration").slider();
  $("#nbIteration").on("slide", function(slideEvt) {
  	$("#nbIterationSliderVal").text(slideEvt.value);
  });*/

  $('#form').on('submit', function (event) {
    event.preventDefault();
    plot.draw();
  });

  $('#next').on('click', function () {
    plot.nextStep();
  });

  $('#previous').on('click', function () {
    plot.previousStep();
  });

  $('#x2Group').on('input', function(){
    if($('input[name=methodOption]:checked', '#method').val() == 'dichotomy'){
      plot.redraw();
    }
  })

  $('#x1Group').on('input', function(){
    plot.redraw();
  })

  $('#method input').on('change', function() {
    let resultArea = $('#result');
    let method = null;
     switch($('input[name=methodOption]:checked', '#method').val()){
       case 'dichotomy':
         method = new Dichotomy(plot, resultArea);
         $('#x2Group').show();
         break;
       case 'tangent':
         method = new Tangent(plot, resultArea);
         $('#x2Group').hide();
         break;
       case 'fixedPoint':
         method = new FixedPoint(plot, resultArea);
         $('#x2Group').hide();
         break;
     }
     plot.setAlgorithme(method);
     plot.draw();
  });

  //Provoque le déclenchement de l'affichage du graphe
  $('#method input').trigger('change');
})