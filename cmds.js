

const {models} = require('./model');
const {log, biglog, errorlog, colorize} = require("./out");
const Sequelize = require('sequelize');

exports.helpCmd = (socket, rl) => {
    log(socket, socket, "Comandos:");
    log(socket, socket, "  h|help - Muestra esta ayuda.");
    log(socket, socket, "  list - Listar los quizzes existentes.");
    log(socket, socket, "  show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log(socket, socket, "  add - Añadir un nuevo quiz interactivamente.");
    log(socket, socket, "  delete <id> - Borrar el quiz idicado.");
    log(socket, socket, "  edit <id> - Editar el quiz indicado.");
    log(socket, socket, "  test <id> - Probar el quiz indicado.");
    log(socket, socket, "  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket, socket, "  credits - Créditos.");
    log(socket, socket, "  q|quit - Salir del programa.");
    rl.prompt();
};

const makeQuestion = (socket, rl, text) => {
  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });
};

exports.addCmd = (socket, rl) => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
    .then(q => {
      return makeQuestion(rl, ' Introduzca la respuesta ')
      .then(a => {
        return {question: q, answer: a};
      });
    })
    .then(quiz => {
      return models.quiz.create(quiz);
    })
    .then(quiz => {
      log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} $${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog(socket, 'El quiz es erroneo:');
      error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
      errorlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

exports.listCmd = (socket, rl) => {
    models.quiz.findAll()
    .each(quiz => {
        log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
    })
    .catch(error => {
      errorlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

const validateId = id => {
  return new Sequelize.Promise((resolve, reject) => {
    if (typeof id === "undefined") {
      reject(new Error(`Falta el parámetro <id>.`));
    } else {
      id = parseInt(id);
      if (Number.isNaN(id)) {
        reject(new Error(`El valor del parámetro <id> no es un número.`));
      } else {
        resolve(id);
      }
    }
  });
};

exports.showCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.findByPk(id))
    .then(quiz => {
      if (!quiz) {
        throw new Error(`No existe un quiz asociado al id=${id}.`);
      }
      log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}.`);
    })
    .catch(error => {
      errorlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

exports.testCmd = (socket, rl, id) => {
    validateId(id)
   .then(id => models.quiz.findByPk(id))
   .then(quiz => {
     if (!quiz) {
       throw new Error(`No existe un quiz asociado al id=${id}.`)
     }
     return makeQuestion(rl, ` ¿${quiz.question}?: `)
      .then(answ => {
        quest = quiz.answer.toLowerCase().trim()
        ans = answ.toLowerCase().trim()
        if (ans === quest) {
            log(socket, `Su respuesta es correcta:`);
            biglog(socket, `CORRECTO`, 'green');
        } else {
            log(socket, `Su respuesta es incorrecta:`);
            biglog(socket, `INCORRECTO`, 'red');
        }
      })
   })
   .catch(Sequelize.ValidationError, error => {
      errorlog(socket, 'El quiz es erroneo:');
      error.errors.forEach(({message}) => errorlog(socket, message));
   })
   .catch(error => {
      errorlog(socket, error.message);
   })
   .then(() => {
      rl.prompt();
   });
};

exports.playCmd = (socket, rl) => {
      let score = 0;
      let toBeResolved = [];
      let i=0;
      for(i ; i<models.quiz.count(); i++){
         toBeResolved[i]=i;
      }
      const playOne = () => {
        return Sequelize.Promise.resolve()
            .then(()=>{
                if(toBeResolved.length === 0){
                    log(socket, `No hay mas preguntas`);
                    log(socket, `Fin del examen. Aciertos:`);
                    log(socket, `${score}`);
                    return;
                }
                let id = Math.floor(Math.random() * toBeResolved.length);
                let quiz = toBeResolved[id];
                toBeResolved.splice(id,1);
                return makeQuestion(rl,`¿${quiz.question}?: `)
                    .then(answ => {
                        quest = quiz.answer.toLowerCase().trim()
                        ans = answ.toLowerCase().trim()
                        if(ans === quest){
                            score++;
                            log(socket, `CORRECTO - Lleva ${score} aciertos.`);
                            return playOne();
                        }else{
                            log(socket, `INCORRECTO`);
                            log(socket, `Fin del examen. Aciertos:`);
                            log(socket, `${score}`);
                            return;
                        }

                    })
            })};
    	models.quiz.findAll({raw: true}) 
    	.then(quizzes => {
    			toBeResolved = quizzes;
      })
      .then(() => {
    		 return playOne(); 
      })
     .catch(error => {
        errorlog(socket, error.message);
     })
     .then(() => {
        rl.prompt();
     });
};

exports.deleteCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
      errorlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

exports.editCmd = (socket, rl, id) => {
   validateId(id)
   .then(id => models.quiz.findByPk(id))
   .then(quiz => {
     if (!quiz) {
       throw new Error(`No existe un quiz asociado al id=${id}.`);
     }
     process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
     return makeQuestion(rl, ' Introduzca la pregunta: ')
     .then(q => {
       process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
       return makeQuestion(rl, ' Introduzca la respuesta ')
       .then(a => {
         quiz.question = q;
         quiz.answer = a;
         return quiz;
       });
     });
   })
   .then(quiz => {
     return quiz.save();
   })
   .then(quiz => {
     log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
   })
   .catch(Sequelize.ValidationError, error => {
      errorlog(socket, 'El quiz es erroneo:');
      error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
      errorlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

exports.credits = (socket, rl) => {
    log(socket, 'Autor de la práctica:', 'green');
    log(socket, 'Jaime Romero', 'green');
    rl.prompt();
};

exports.quitCmd = (socket, rl) => {
    rl.close();
	socket.end();
};

