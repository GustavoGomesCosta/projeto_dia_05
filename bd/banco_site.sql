create database site_votacao;

use site_votacao;

CREATE TABLE usuario(
    id_usuario int auto_increment primary key,
    nome varchar(60) NOT null,
    email varchar(100) NOT null unique,
    senha varchar(40) not null,
    data_cadastro date
);

CREATE TABLE candidato(
    id_candidato int not null auto_increment PRIMARY KEY,
    nome varchar(60) NOT null,
    numero int not null UNIQUE
);

CREATE TABLE voto(
    id_voto int not null auto_increment primary key,
    data_voto date,
    id_usuario int not null unique,
    id_candidato int not null,
    constraint fk_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_candidato FOREIGN KEY (id_candidato) REFERENCES candidato(id_candidato)
);
