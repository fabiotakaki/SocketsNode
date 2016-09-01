/* Authors: 
  Arthur Pires
  Fábio S. Takaki
  Lucas Martins
  Ming
*/

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
socket.emit('10 GAR-LIST');

// Se sucesso, adiciono eles no select
socket.on('50 GAR-LIST-OK', function(rows){
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
socket.on('153 GAR-CONNECT-NOT', function(){
  alert('Este garçom está conectado ou há algum erro em identificar o mesmo.');
});

//------------------------------//
//----- Listagem de Mesas ------//
//------------------------------//
// Se caso o Garçom foi identificado com sucesso requisito as mesas
socket.on('152 GAR-CONNECT-OK', function(){
  socket.emit('1000 TBL-LIST');
});

// Se sucesso, adiciono eles no content
socket.on('1050 TBL-LIST-OK', function(rows){
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
socket.on('450 ORD-CONSULT-OK', function(rows){
  var html = '';
  var orders_select = '';
  var tables_select = '';

  console.log(rows);

  html += '<div class="col-lg-12">\
              <h1>Listagem de Pedidos da Mesa '+rows[0]+'</h1>\
              <p><button id="listTables" idTable="'+rows[0]+'" class="btn btn-primary">Listagem de Mesas</button></p>\
              <p><label><b>Produtos</b></label><br><select id="products-select" multiple></select></p>\
              <button id="addOrder" class="btn btn-primary">Adicionar Pedido</button>\
          </div>';
  html += '<table class="table table-hover">\
          <thead>\
            <tr>\
              <th>Número do Pedido</th>\
              <th>Produtos</th>\
              <th>Preço</th>\
              <th>Ações</th>\
            </tr>\
          </thead>\
          <tbody>';

  var total = 0.0;
  for (var i = 0; i < rows[1].length; i++) {
    var products = '';
    var totalOrder = 0.0;
    for(var j=0; j< rows[2].length; j++){
      if(rows[2][j].idOrder == rows[1][i].idOrder){
        products += rows[2][j].name+', ';
        totalOrder += rows[2][j].price;
      }
    }

    total += totalOrder;

    html += '<tr>\
              <th scope="row">'+rows[1][i].idOrder+'</th>\
              <td>'+products+'</td>\
              <td>R$ '+totalOrder.toFixed(2)+'</td>\
              <td>\
              <div class="btn-group" role="group">\
                <button class="btn btn-primary" id="viz-order" idOrder="'+rows[1][i].idOrder+'">Visualizar</button> \
                <button class="btn btn-warning" id="edit-order" idOrder="'+rows[1][i].idOrder+'">Editar</button> \
                <button class="btn btn-danger" idOrder="'+rows[1][i].idOrder+'" id="delOrder">Deletar</button>\
              </div>\
              </td>\
            </tr>';
    orders_select += '<option value="'+rows[1][i].idOrder+'">Pedido '+rows[1][i].idOrder+'</option>';
  }
  html += '<tr><th>Total</th><td></td><th>R$ '+total.toFixed(2)+'</th><td><button class="btn btn-danger" id="close" idTable="'+rows[0]+'">Fechar Conta</button></td>';

  html += '</tbody></table>';

  html += '<h4>Transferir Pedido</h4>';
  html += '<label>Pedido</label><br><select id="orders-select"></select><br>';
  html += '<label>Para Mesa</label><br><select id="tables-select"></select><br><br>';
  html += '<button class="btn btn-success" id="transfer-order">Transferir</button>';

  $('#content').html(html);

  $('#orders-select').html(orders_select);

  socket.emit('1100 PRO-LIST');
  socket.emit('1300 TBL-LIST-SELECT');
});

//------------------------------//
//-- Listagem de Mesas SELECT --//
//------------------------------//
// Se sucesso, adiciono eles no select
socket.on('1350 TBL-LIST-SELECT-OK', function(rows){
  var html = '';

  for (var i = 0; i < rows.length; i++) {
    html += '<option value="'+rows[i].idTable+'">Mesa '+rows[i].idTable+'</option>';
  }
  $('#tables-select').html(html);

});

//------------------------------//
//----- Listagem de Produtos ---//
//------------------------------//
// Se sucesso, adiciono eles no select
socket.on('1150 PRO-LIST-OK', function(rows){
  var html = '';

  for (var i = 0; i < rows.length; i++) {
    html += '<option value="'+rows[i].idProduct+'">'+rows[i].name+' - R$'+rows[i].price.toFixed(2)+'</option>';
  }
  $('#products-select').html(html);

});

//------------------------------//
//----- Visualiza Pedido -------//
//------------------------------//
socket.on('650 ORD-SHOW-OK', function(data){
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
              <td>R$ '+data[0][i].price.toFixed(2)+'</td>\
            </tr>';
  }
  html += '<tr>\
            <th scope="row">Total</th>\
            <td></td>\
            <th>R$ '+data[1][0].total.toFixed(2)+'</th>\
          </tr>';
  html += '</tbody></table>';

  $('#viz-modal-body').html(html);

  $('#viz-modal').modal();

});

//------------------------------//
//-- Visualiza editar Pedido ---//
//------------------------------//
socket.on('850 ORD-EDIT-SHOW-OK', function(data){
  var html = '';
  var order = data[0][0];
  var products = data[1];

  $('#edit-modal-title').html('Editar Pedido');

  console.log(data);

  html += 'Número do pedido: <b id="idOrderEdit">'+order.idOrder+'</b>';
  html += '<p><label><b>Produtos</b></label><br><select id="products-select-edit" multiple></select></p>';

  $('#edit-modal-body').html(html);

  var products_select_edit = '';

  for (var i = 0; i < products.length; i++) {
    products_select_edit += '<option value="'+products[i].idProduct+'">'+products[i].name+' - R$'+products[i].price.toFixed(2)+'</option>';
  }

  $('#products-select-edit').html(products_select_edit);

  for(var i=0; i<data[0].length; i++){
    $('#products-select-edit option').each(function(index){
      if(data[0][i].idProduct == $(this).val()){
        $(this).attr('selected', true);
      }
    });
  }

  $('#edit-modal').modal();

});

//------------------------------//
//-- Visualiza editar Pedido ---//
//------------------------------//
socket.on('850 ORD-EDIT-OK', function(data){
  $('#edit-modal').modal('hide');
  alert('Pedido atualizado com sucesso');
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

// editar pedido
$(document).off('click', '#edit-order').on('click', '#edit-order', function (e) {
  socket.emit('800 ORD-EDIT-SHOW', $(this).attr('idOrder'));
  e.preventDefault();
});

// editar pedido modal
$(document).off('click', '#edit-modal-submit').on('click', '#edit-modal-submit', function (e) {
  var data = [];
  var products = [];
  data.push($('#idOrderEdit').text());
  $('#products-select-edit :selected').each(function(i, selected){ 
    products[i] = $(selected).val();
  });
  data.push(products);
  data.push(idTable);
  socket.emit('801 ORD-EDIT', data);
  e.preventDefault();
});

// transfere pedido
$(document).off('click', '#transfer-order').on('click', '#transfer-order', function (e) {
  var data = [];
  var table = $('#tables-select').val();
  var order = $('#orders-select').val();
  var old_table = idTable;
  var c = confirm('Tem certeza que deseja transferir o pedido '+ order +' para a mesa '+ table +'?');
  if (c == true) {
    data.push(table);
    data.push(order);
    data.push(old_table);
    socket.emit('500 ORD-TRANSFER', data);
  }
  e.preventDefault();
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
