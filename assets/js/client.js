// Author: Fábio S. Takaki

// Solução para imprimir elementos
function printElement(elem, append, delimiter) {
    var domClone = elem.cloneNode(true);

    var $printSection = document.getElementById("printSection");

    if (!$printSection) {
        var $printSection = document.createElement("div");
        $printSection.id = "printSection";
        document.body.appendChild($printSection);
    }

    if (append !== true) {
        $printSection.innerHTML = "";
    }

    else if (append === true) {
        if (typeof(delimiter) === "string") {
            $printSection.innerHTML += delimiter;
        }
        else if (typeof(delimiter) === "object") {
            $printSection.appendChlid(delimiter);
        }
    }

    $printSection.appendChild(domClone);
}

// Começa o socket.
var socket = io();

var idTable = 0; // Vamos usá-la para identificar a tabela que estamos interagindo.

// Requisito os Waiters
socket.emit('50 GAR-LIST');

// Se sucesso, adiciono eles no select
socket.on('60 GAR-LIST-OK', function(rows){
  var html = '';

  for (var i = 0; i < rows.length; i++) {
    if(rows[i].connected == 'S'){
      html += '<option value="'+rows[i].idWaiter+'">'+rows[i].name+' - CONECTADO</option>';
    }else{
      html += '<option value="'+rows[i].idWaiter+'">'+rows[i].name+' - DESCONECTADO</option>';
    }
  }

  $('#waiter').html(html);

});

// envio o id do Garçom
$('form').submit(function(){
  socket.emit('100 GAR-WAITER', $('#waiter').val());
  return false;
});

// Se caso o Garçom foi identificado estiver online..
socket.on('154 GAR-CONNECT-NOT', function(){
  alert('Este garçom está conectado ou há algum erro em identificar o mesmo.');
});

//------------------------------//
//----- Listagem de Mesas ------//
//------------------------------//
// Se caso o Garçom foi identificado com sucesso requisito as mesas
socket.on('150 GAR-CONNECT-OK', function(){
  socket.emit('1000 TBL-LIST');
});

// Se sucesso, adiciono eles no content
socket.on('1000 TBL-LIST-OK', function(rows){
  var html = '';

  html += '<div class="col-lg-12"><h1>Listagem de Mesas</h1> <p>As mesas em vermelho indicam que a mesa está fechada. Para abri-lá, clique em visualizar.</p></div>';
  for (var i = 0; i < rows.length; i++) {
    if(rows[i].status == 'F')
      html += '<div class="col-lg-4"><div class="card card-danger" style="color: #fff;">';
    else
      html += '<div class="col-lg-4"><div class="card card-success" style="color: #fff;">';
      html += '<div class="card-block">\
                    <h4 class="card-title">Mesa '+rows[i].idTable+' </h4>\
                    <p class="card-text">Visualize a mesa para realizar pedidos.</p>\
                    <button class="btn btn-primary" id="viz" idTable="'+rows[i].idTable+'">Visualizar</button>\
                  </div>\
                </div>\
              </div>';
  }

  $('#content').html(html);
});


//------------------------------//
//----- Listagem de Pedidos ----//
//------------------------------//
// Se sucesso, adiciono eles no content
socket.on('453 ORD-CONSULT-OK', function(rows){
  var html = '';

  html += '<div class="col-lg-12">\
              <h1>Listagem de Pedidos da Mesa '+rows[0]+'</h1>\
              <p><button id="listTables" idTable="'+rows[0]+'" class="btn btn-primary">Listagem de Mesas</button></p>\
              <p><label><b>Produtos</b></label><br><select id="products-select" multiple></select></p>\
              <button id="addOrder" class="btn btn-primary">Adicionar Pedido</button>\
              <button class="btn btn-danger" id="close" idTable="'+rows[0]+'">Fechar Conta</button>\
          </div>';
  html += '<table class="table table-hover">\
          <thead>\
            <tr>\
              <th>Número do Pedido</th>\
              <th>Ações</th>\
            </tr>\
          </thead>\
          <tbody>';
  for (var i = 0; i < rows[1].length; i++) {
    html += '<tr>\
              <th scope="row">'+rows[1][i].idOrder+'</th>\
              <td>\
              <div class="btn-group" role="group">\
                <button class="btn btn-primary" id="viz-order" idOrder="'+rows[1][i].idOrder+'">Visualizar</button> \
                <button class="btn btn-warning">Editar</button> \
                <button class="btn btn-danger" idOrder="'+rows[1][i].idOrder+'" id="delOrder">Deletar</button>\
              </div>\
              </td>\
            </tr>';
  }
  html += '</tbody></table>';

  $('#content').html(html);

  socket.emit('1100 PRO-LIST');
});

//------------------------------//
//----- Listagem de Produtos ---//
//------------------------------//
// Se sucesso, adiciono eles no select
socket.on('1150 PRO-LIST-OK', function(rows){
  var html = '';

  for (var i = 0; i < rows.length; i++) {
    html += '<option value="'+rows[i].idProduct+'">'+rows[i].name+' - R$'+rows[i].price+'</option>';
  }
  $('#products-select').html(html);

});

//------------------------------//
//------- Ações de Botões ------//
//------------------------------//

// visualiza mesa
$(document).off('click', '#viz').on('click', '#viz', function (e) {
  idTable = $(this).attr('idTable');
  socket.emit('400 ORD-CONSULT', idTable);
  e.preventDefault();
});

// lista as mesas
$(document).off('click', '#listTables').on('click', '#listTables', function (e) {
  socket.emit('1000 TBL-LIST', $('#listTables').attr('idTable'));
  e.preventDefault();
});


// Adiciona pedido !!!
$(document).off('click', '#addOrder').on('click', '#addOrder', function (e) {
  var data = [];
  var products = []; 
  data.push(idTable);
  $('#products-select :selected').each(function(i, selected){ 
    products[i] = $(selected).val(); 
  });
  data.push(products);

  socket.emit('300 ORD-CREATE', data);
  e.preventDefault();
});

// Deleta pedido
$(document).off('click', '#delOrder').on('click', '#delOrder', function (e) {
  var idOrder = $(this).attr('idOrder');
  var data = [];
  data.push(idTable);
  data.push(idOrder);
  var c = confirm("Tem certeza que deseja deletar o pedido ?");
  if (c == true) {
    socket.emit('700 ORD-DELETE', data);
  }
  e.preventDefault();
});

// visualizar pedido
$(document).off('click', '#viz-order').on('click', '#viz-order', function (e) {
  socket.emit('600 ORD-SHOW', $(this).attr('idOrder'));
  e.preventDefault();
});

//------------------------------//
//----- Visualiza Pedido -------//
//------------------------------//
socket.on('650 ORD-SHOW-OK', function(data){
  console.log(data);
  var html = '';

  $('#viz-modal-title').html('Produtos');

  html += '<table class="table table-hover">\
          <thead>\
            <tr>\
              <th>Número do Pedido</th>\
              <th>Produto</th>\
              <th>Preço</th>\
            </tr>\
          </thead>\
          <tbody>';
  for (var i = 0; i < data[0].length; i++) {
    html += '<tr>\
              <th scope="row">'+data[0][i].idOrder+'</th>\
              <td>'+data[0][i].name+'</td>\
              <td>R$ '+data[0][i].price+'</td>\
            </tr>';
  }
  html += '<tr>\
            <th scope="row">Total</th>\
            <td></td>\
            <th>R$ '+data[1][0].total+'</th>\
          </tr>';
  html += '</tbody></table>';

  $('#viz-modal-body').html(html);

  $('#viz-modal').modal();

});

// imprimir pedido
$(document).off('click', '#viz-modal-print').on('click', '#viz-modal-print', function (e) {
  printElement(document.getElementById('viz-modal-body'));
  window.print();
  e.preventDefault();
});

// fechamento de conta
$(document).off('click', '#close').on('click', '#close', function (e) {
  var c = confirm("Tem certeza que deseja fechar a conta ?");
  if (c == true) {
    socket.emit('900 TBL-CLOSE', idTable);
  }
  e.preventDefault();
});
