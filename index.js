// Author: Fábio S. Takaki
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');

// Arquivos estaticos.
app.use("/assets", express.static(__dirname + '/assets'));

//------------------------------//
//----------- ROTAS ------------//
//------------------------------//
// QUANDO CHAMAR O URL:1234 QUE ARQUIVO VOU RENDERIZAR ?
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// SERVIDOR HTTP
http.listen(1234, function(){
  console.log('Listening on *:1234');
});

// SOCKETS
io.on('connection', function(socket){
  var idWaiter = 0;

  // imprime os bytes lidos, acho que não tem necessidade.
  //console.log('Bytes Read:' + socket.request.connection._handle.bytesRead);

  console.log('New User Conected:', socket.request.connection._peername);

  // Quando houver uma conexão socket, começo a conexão com o banco de dados
  var con = mysql.createConnection({
    host: "localhost",
    user: "atividade",
    password: "atividade123",
    database: "atividade"
  });

  // Verifico se a conexão com o banco de dados foi sucedida e printo.
  con.connect(function(err){
    if(err){
      console.log('Error connecting to Database');
      return;
    }
    console.log('Connection established with Database');
  });

  // quando é desconectado
  socket.on('disconnect', function(){

    // Se esse socket estiver conectado com um garçom, devo tirar o status de conectado.
    if(idWaiter != 0){
      con.query(
        'UPDATE waiters SET connected = ? Where idWaiter = ?',
        ["N", idWaiter],
        function (err, result) {
          if (err) throw err;

          console.log('Changed ' + result.changedRows + ' rows');
          console.log('User disconnected', socket.request.connection._peername);
          console.log('200 GAR-DISCONNECT');
        }
      );
    }

    // Mando a listagem de Garçons para todos os outros
    // identificarem quem está online
    con.query('SELECT * FROM waiters',function(err,rows){
      // Se caso der erro, envio um 80 GAR-LIST-NOT
      if(err){
        console.log('80 GAR-LIST-NOT');
         socket.broadcast.emit('80 GAR-LIST-NOT');
      }

      console.log('60 GAR-LIST-OK');
       socket.broadcast.emit('60 GAR-LIST-OK', rows);
    });

    // encerro a conexão do banco de dados
    con.end(function(err) {
      console.log('Database closed conection');
      // The connection is terminated gracefully
      // Ensures all previously enqueued queries are still
      // before sending a COM_QUIT packet to the MySQL server.
    });

  });

  // Função que devolve os garçons do banco de dados
  socket.on('50 GAR-LIST', function(){
    // Mando a listagem de Garçons para a página
    con.query('SELECT * FROM waiters',function(err,rows){

      // Se caso der erro, envio um 80 GAR-LIST-NOT
      if(err){
        console.log('80 GAR-LIST-NOT');
        io.emit('80 GAR-LIST-NOT');
      }

      console.log('60 GAR-LIST-OK');
      io.emit('60 GAR-LIST-OK', rows);
    });
  });


//--------------------------------//
//----------- FUNÇÕES ------------//
//--------------------------------//

  //------------------------------//
  //----- Identifica Garçom ------//
  //------------------------------//
  socket.on('100 GAR-WAITER', function(id){
    console.log('100 GAR-WAITER ' + id);
    
    // Se o ID for nulo, ou não existir no banco, responde com 153 GAR-WAITER-NOT
    if(id == null){
      console.log('153 GAR-WAITER-NOT');
      socket.emit('153 GAR-WAITER-NOT');
    }

    // consulto e vejo se o garçom existe e se ele não está conectado
    con.query('SELECT * FROM waiters WHERE idWaiter='+id ,function(err,row){
      if(err){
        console.log('153 GAR-WAITER-NOT');
        socket.emit('153 GAR-WAITER-NOT');
      }

      // se o garçom estiver conectado !
      if(row[0].connected == 'S'){
        console.log('154 GAR-CONNECT-NOT');
        socket.emit('154 GAR-CONNECT-NOT');
      
      // senão atualizo para conectado e envio o sucesso da conexão do garçom.
      }else{ 
        con.query(
          'UPDATE waiters SET connected = ? Where idWaiter = ?',
          ["S", id],
          function (err, result) {
            if (err){
              console.log('154 GAR-CONNECT-NOT');
              socket.emit('154 GAR-CONNECT-NOT');
            }

            idWaiter = id;
            console.log('Changed ' + result.changedRows + ' rows');
            console.log('150 GAR-CONNECT-OK');

            socket.emit('150 GAR-CONNECT-OK');

            // Mando a listagem de Garçons para todos os outros
            // identificarem quem está online
            con.query('SELECT * FROM waiters',function(err,rows){
              // Se caso der erro, envio um 80 GAR-LIST-NOT
              if(err){
                console.log('80 GAR-LIST-NOT');
                 socket.broadcast.emit('80 GAR-LIST-NOT');
              }

              console.log('60 GAR-LIST-OK');
               socket.broadcast.emit('60 GAR-LIST-OK', rows);
            });
          }
        );
      }
    });

  });
  // Fim da identificação do garçom

  //------------------------------//
  //----- Listagem de Mesas ------//
  //------------------------------//
  socket.on('1000 TBL-LIST', function(table){
    // Saiu da sala de pedidos
    socket.leave('orders'+table);

    // Crio uma sala pra quem está na listagem de mesas
    socket.join('tables');

    // Mando a listagem de mesas para a página
    con.query('SELECT * FROM tables',function(err,rows){

      // Se caso der erro, envio um 1000 TBL-LIST-NOT
      if(err){
        console.log('1000 TBL-LIST-NOT');
        socket.emit('1000 TBL-LIST-NOT');
      }

      console.log('1000 TBL-LIST-OK');
      socket.emit('1000 TBL-LIST-OK', rows);
    });

  });

  //------------------------------//
  //----- Listagem de Produtos ---//
  //------------------------------//
  // Função que devolve os produtos do banco de dados
  socket.on('1100 PRO-LIST', function(){
    // Mando a listagem de produtos para a página
    con.query('SELECT * FROM products',function(err,rows){

      // Se caso der erro, envio um 1100 PRO-LIST-NOT
      if(err){
        console.log('1151 PRO-LIST-NOT');
        socket.emit('1151 PRO-LIST-NOT');
      }

      console.log('1150 PRO-LIST-OK');
      socket.emit('1150 PRO-LIST-OK', rows);
    });
  });

  //------------------------------//
  //----- Listagem de Pedidos ----//
  //------------------------------//
  socket.on('400 ORD-CONSULT', function(table){
    // Saiu da sala de mesas
    socket.leave('tables');

    // entro na sala de pedidos
    socket.join('orders'+table);

    // Mando a listagem de mesas para a página
    con.query('SELECT * FROM orders WHERE idTable='+table ,function(err,rows){
      var data = [];
      data.push(table);
      // Se caso der erro, envio um 453 ORD-CONSULT-NOT
      if(err){
        console.log('453 ORD-CONSULT-NOT');
        socket.emit('453 ORD-CONSULT-NOT');
      }
      data.push(rows);

      console.log('453 ORD-CONSULT-OK');
      socket.emit('453 ORD-CONSULT-OK', data);
    });
  });

  //------------------------------//
  //------- Adiciona Pedido ------//
  //------------------------------//
  socket.on('300 ORD-CREATE', function(data){
    
    // Se não foi enviado nenhum produto, não adiciono e retorno o NOT
    if(data[1].length == 0){
      console.log('353 ORD-CREATE-NOT');
      socket.emit('353 ORD-CREATE-NOT');
      return;
    }

    // Atualizo a mesa para aberta !
    con.query(
      'UPDATE tables SET status = ? Where idTable = ?',
      ["A", data[0]],
      function (err, result) {
        if (err){
          console.log('1270 TBL-STATUS-NOT');
          socket.emit('1270 TBL-STATUS-NOT');
        }

        console.log('Changed ' + result.changedRows + ' rows');
        console.log('1271 TBL-STATUS-OK');

        socket.emit('1271 TBL-STATUS-OK');
      }
    );

    //insiro o pedido
    var order = { idTable: data[0]};
    con.query('INSERT INTO orders SET ?', order, function(err,res){

      if(err){
        console.log('353 ORD-CREATE-NOT');
        socket.emit('353 ORD-CREATE-NOT');
      }else{
        console.log('350 ORD-CREATE-OK');

        var order_id = res.insertId;
        // adiciono os produtos nos pedidos
        for(var i=0; i<data[1].length; i++){
          console.log('1200 ORD-PRODUCT');
          var order_product = { idProduct: data[1][i], idOrder: order_id };
          con.query('INSERT INTO orders_products SET ?', order_product, function(err,res2){

            if(err){
              console.log('1251 ORD-PRODUCT-NOT');
              socket.emit('1251 ORD-PRODUCT-NOT');
            }else{
              console.log('1250 ORD-PRODUCT-OK');
            }
          });
        }

        // Mando a listagem de mesas para todos que estão na listagem de mesas
        con.query('SELECT * FROM tables',function(err,rows){

          // Se caso der erro, envio um 1000 TBL-LIST-NOT
          if(err){
            console.log('1000 TBL-LIST-NOT');
            socket.to('tables').emit('1000 TBL-LIST-NOT');
          }

          console.log('1000 TBL-LIST-OK');
          socket.to('tables').emit('1000 TBL-LIST-OK', rows);
        });

        // Devolvo a listagem de pedidos pra todo mundo que esta na de pedidos
        con.query('SELECT * FROM orders WHERE idTable='+data[0] ,function(err,rows){

          var orders_list = [];
          orders_list.push(data[0]);
          // Se caso der erro, envio um 453 ORD-CONSULT-NOT
          if(err){
            console.log('453 ORD-CONSULT-NOT');
            io.in('orders'+data[0]).emit('453 ORD-CONSULT-NOT');
          }

          orders_list.push(rows);
          console.log('453 ORD-CONSULT-OK');
          io.in('orders'+data[0]).emit('453 ORD-CONSULT-OK', orders_list);
        });
      }
    });

  });

  //------------------------------//
  //------- Deleta o Pedido ------//
  //------------------------------//
  socket.on('700 ORD-DELETE', function(data){
    // agora deleto o pedido
    con.query(
      'DELETE FROM orders WHERE idOrder = ?',
      [data[1]],
      function (err, result2) {
        if (err){
          console.log('751 ORD-DELETE-NOT');
          socket.emit('751 ORD-DELETE-NOT');
        }else{

          // Devolvo a listagem de pedidos pra todo mundo que esta na de pedidos
          con.query('SELECT * FROM orders WHERE idTable='+data[0] ,function(err,rows){

            var orders_list = [];
            orders_list.push(data[0]);
            // Se caso der erro, envio um 453 ORD-CONSULT-NOT
            if(err){
              console.log('453 ORD-CONSULT-NOT');
              io.in('orders'+data[0]).emit('453 ORD-CONSULT-NOT');
            }

            orders_list.push(rows);
            console.log('453 ORD-CONSULT-OK');
            io.in('orders'+data[0]).emit('453 ORD-CONSULT-OK', orders_list);
          });

          // Se a quantidade de pedidos for 0, eu fecho a mesa
          con.query('SELECT COUNT(*) AS count FROM orders WHERE idTable = '+data[0],function(err,result3){
            if(result3[0].count == 0){
              // Atualizo a mesa para fechada !
              con.query(
                'UPDATE tables SET status = ? Where idTable = ?',
                ["F", data[0]],
                function (err, result) {
                  if (err){
                    console.log('1270 TBL-STATUS-NOT');
                    socket.emit('1270 TBL-STATUS-NOT');
                  }

                  console.log('Changed ' + result.changedRows + ' rows');
                  console.log('1271 TBL-STATUS-OK');

                  socket.emit('1271 TBL-STATUS-OK');

                  // Mando a listagem de mesas para todos que estão na listagem de mesas
                  con.query('SELECT * FROM tables',function(err,rows){

                    // Se caso der erro, envio um 1000 TBL-LIST-NOT
                    if(err){
                      console.log('1000 TBL-LIST-NOT');
                      socket.to('tables').emit('1000 TBL-LIST-NOT');
                    }

                    console.log('1000 TBL-LIST-OK');
                    socket.to('tables').emit('1000 TBL-LIST-OK', rows);
                  });
                }
              );
            }
          });

          console.log('750 ORD-DELETE-OK');
          socket.emit('750 ORD-DELETE-OK');
          console.log('Deleted ' + result2.affectedRows + ' rows');
        }

      }
    );
  });



  //------------------------------//
  //----- Fechamento de Conta ----//
  //------------------------------//
  socket.on('900 TBL-CLOSE', function(idTable){
    // deleto os pedidos da mesa primeiro
    con.query(
      'DELETE FROM orders WHERE idTable = ?',
      [idTable],
      function (err, result1) {
        if (err){
          console.log('951 TBL-CLOSE-NOT');
          socket.emit('951 TBL-CLOSE-NOT');
        }else{
          console.log('Deleted ' + result1.affectedRows + ' rows');

          // Devolvo a listagem de pedidos pra todo mundo que esta na de pedidos
          con.query('SELECT * FROM orders WHERE idTable='+idTable ,function(err,rows){

            var orders_list = [];
            orders_list.push(idTable);
            // Se caso der erro, envio um 453 ORD-CONSULT-NOT
            if(err){
              console.log('453 ORD-CONSULT-NOT');
              io.in('orders'+idTable).emit('453 ORD-CONSULT-NOT');
            }

            orders_list.push(rows);
            console.log('453 ORD-CONSULT-OK');
            io.in('orders'+idTable).emit('453 ORD-CONSULT-OK', orders_list);
          });

          // Se a quantidade de pedidos for 0, eu fecho a mesa
          con.query('SELECT COUNT(*) AS count FROM orders WHERE idTable = '+idTable,function(err,result3){
            if(result3[0].count == 0){
              // Atualizo a mesa para fechada !
              con.query(
                'UPDATE tables SET status = ? Where idTable = ?',
                ["F", idTable],
                function (err, result) {
                  if (err){
                    console.log('1270 TBL-STATUS-NOT');
                    socket.emit('1270 TBL-STATUS-NOT');
                  }

                  console.log('Changed ' + result.changedRows + ' rows');
                  console.log('1271 TBL-STATUS-OK');

                  socket.emit('1271 TBL-STATUS-OK');

                  // Mando a listagem de mesas para todos que estão na listagem de mesas
                  con.query('SELECT * FROM tables',function(err,rows){

                    // Se caso der erro, envio um 1000 TBL-LIST-NOT
                    if(err){
                      console.log('1000 TBL-LIST-NOT');
                      socket.to('tables').emit('1000 TBL-LIST-NOT');
                    }

                    console.log('1000 TBL-LIST-OK');
                    socket.to('tables').emit('1000 TBL-LIST-OK', rows);
                  });
                }
              );
            }
          });

          console.log('950 TBL-CLOSE-OK');
          socket.emit('950 TBL-CLOSE-OK');
          console.log('Deleted ' + result1.affectedRows + ' rows');

        } // fim else
      }
    );
  });


});