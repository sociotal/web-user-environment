var util = require('util');
var path = require("path");
var debug = require('debug')('controllers:identity.js');

var java = require("java");
var url = require('url');
var fs = require('fs');

var env = process.env.NODE_ENV || 'development';
var config = require('../../../../config/config')[env];

var BASE_PACKAGE_IDM = "es.um.security.idm";
var CERTS_FOLDER = __dirname + "/certs_sociotal/";


var ADMIN_TOKEN = config.identityManagerParams.admin_token;
var DOMAIN_ID = config.identityManagerParams.domain_id;
var KEYROCK_IP = config.identityManagerParams.keyrock_ip;
var KEYROCK_PORT = config.identityManagerParams.keyrock_port;
var KEYROCK_PORT_SSL = config.identityManagerParams.keyrock_port_ssl;


var libs_path = __dirname + '/../libs';
fs.readdirSync(libs_path).forEach(function (file) {
    if (~file.indexOf('.jar')) {
        java.classpath.push(path.resolve(__dirname + "/../libs/" + file));
    }
});



var HTTPS = java.getStaticFieldValue("es.um.security.utilities.Protocols", "HTTPS");
var cas_certificates = java.newInstanceSync("java.util.ArrayList");
var ca_cert = java.callStaticMethodSync("es.um.security.utilities.CertificateUtil", "getCertificate", CERTS_FOLDER + config.identityManagerParams.cert_name);
if (ca_cert != null)  {
    cas_certificates.addSync(ca_cert);
}

var idm = java.newInstanceSync(BASE_PACKAGE_IDM+".admin.implementation.KeyRockIdMAdminClient", ADMIN_TOKEN, HTTPS, cas_certificates, KEYROCK_IP, KEYROCK_PORT_SSL);

console.log(ADMIN_TOKEN);
console.log(DOMAIN_ID);
console.log(KEYROCK_IP);
console.log(KEYROCK_PORT_SSL);


function _createEntity(_id, _name, _nickName, _userName, _email, _address, _password, cb){

    var id;
    if (_id) {
        id = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Id", _id);
    }else{
        id = null;
    }
    var domain = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Domain");
    var userName = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.UserName", _userName);
    var entity = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.User", id, domain, userName);

    var att_nickName = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.NickName", _nickName);
    var nickName = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","nickName", att_nickName);
    entity.setAttribute(nickName);

    var att_name = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Name", _name);
    var name = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","name", att_name);
    entity.setAttribute(name);

    var address = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Address", _address.type,
      _address.streetAddress, _address.locality, _address.postalCode, _address.country);
    var arrayAddresses = java.newInstanceSync("java.util.ArrayList");
    arrayAddresses.addSync(address);

    var addresses = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "addresses", arrayAddresses);
    entity.setAttribute(addresses);

    var email = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Email", _email);
    var arrayEmails = java.newInstanceSync("java.util.ArrayList");
    arrayEmails.addSync(email);

    var emails = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "emails", arrayEmails);
    entity.setAttribute(emails);

    var att_organization = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Organization", "organization");
    var organization = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","organization", att_organization);
    entity.setAttribute(organization);

    var att_department = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Department", "department");
    var department = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","department", att_department);
    entity.setAttribute(department);

    var stringPassword = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Password", _password);
    var password = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "password", stringPassword);
    entity.setAttribute(password);

    var active = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Active", true);
    var attr_active = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "active", active);

    entity.setAttribute(attr_active);

    cb(entity);
}

function isEntityRegisteredInKeyRock(entity, cb){
    var id = entity.getIdSync().getValueSync().toString();
    var userName = entity.getUserNameSync().getValueSync().toString();

    idm.getEntityById(id, function(err, item){
        if (err){
            idm.getEntityByName(userName, function(err, item){
                if(err){
                    debug("non presente come id e non presente come username");
                    cb(false, err);
                } else {
                    debug("non presente come id ma presente come username");
                    cb(true, item);
                }
            });
        }else{
            debug(" presente come id presente come username");
            cb(true, item);
        }

    });

}


/* ##### ADD ENTITY (e.g. User) ##### */
function _addEntity(entity, id, cb) {
    debug("##### ADD ENTITY #####");
    var res;

    isEntityRegisteredInKeyRock(entity, function(presence, message){
        debug("presence: "+presence +" and "+message);
        if (!presence){
            debug("non presente su keyrock quindi chiamo addEntity");

            idm.addEntity(entity, function(err, item){
                if(err){
                    debug("err su addEntity "+err);
                    res = "error with addentity on keyrock"+message;
                }else{
                    debug("not err su addEntity "+item);
                    res = entity;
                }
                cb(res);
            });
        }else{
            debug(" presente su keyrock quindi non chiamo addEntity");

            res = entity;
            cb(res);
        }
    });
}

/* ##### UPDATE ENTITY (e.g. User) ##### */
function _updateEntity(id, org, department, streetAddress, locality, postalCode, country, cb) {
    console.log("##### UPDATE ENTITY #####");
    var res;

    idm.getEntityById(id, function(err, entity){
        if (err){
            res = "ERROR item does not exists on keyrock "+err;
            cb(res);
        }else{
            entity.removeAttribute(entity.getAttributeSync("organization"));
            entity.removeAttribute(entity.getAttributeSync("department"));
            entity.removeAttribute(entity.getAttributeSync("addresses"));

            var att_organization = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Organization", org);
            var organization_obj = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","organization", att_organization);
            entity.setAttribute(organization_obj);

            var att_department = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Department", department);
            var department_obj = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","department", att_department);
            entity.setAttribute(department_obj);

            var address = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Address", "type", streetAddress, locality, postalCode, country);
            var arrayAddresses = java.newInstanceSync("java.util.ArrayList");
            arrayAddresses.addSync(address);
            var addresses = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "addresses", arrayAddresses);
            entity.setAttribute(addresses);

            idm.updateEntity(entity);
            res = "User Successfully updated";

            cb(res);
        }

    });


    // idm.updateEntity(newEntity, function(err, item){
    //     if(err){
    //         debug("err on updateEntity "+err);
    //         res = "error with updateEntity on keyrock"+message;
    //     }else{
    //         debug("not err on updateEntity "+item);
    //         res = newEntity;
    //     }
    //     cb(res);
    // });

}



/* ##### REMOVE ENTITY BY ID (e.g. User) ##### */
function _removeEntityByID(id, cb) {
    debug("##### REMOVE ENTITY #####");
    var res = "";

    idm.getEntityById(id, function(err, item){
        if (err){
            res = "ERROR item does not exists on keyrock "+err;
            cb(res);
        }else{
            res = "item exists";
            idm.removeEntity(id, function(err, item){
                if(err){
                    res = "ERROR removeEntity with removeEntity on keyrock"+err;
                }else{
                    res = "removeEntity successful removed on keyrock: "+item;
                }
                cb(res);
            });
        }

    });

}





/* ##### GET ENTITY BY ID (e.g. User) ##### */
function _getEntityById(id) {
    debug("##### GET ENTITY BY ID (e.g. User) #####");
    return idm.getEntityByIdSync(id).toString()
}



/* ##### GET INFO TOKEN ##### */
function getInfoToken(token_id) {
    debug("##### GET INFO TOKEN #####");
    var token = idm.getInfoTokenSync(token_id);
    debug("\tToken_ID: " + token.getToken_idSync() + "\n\tUser_ID: " + token.getUser_idSync() + "\n\tUser_domain: " + token.getUser_domainSync() + "\n\tExpiry date: " + token.getExpiry_dateSync());
}



/////////////////////// *********************************** EXPORTS ***********************************////////////////////

exports.addEntity = function(user, password, _cb) {
    debug("createEntity request for user: "+user);
//  var id = user._id.toString();           /// Object id must be codified in string with toString()
    var id = null;
    var name = user.name;
    var nickName = user.username;
    var userName = user.username;
    var email = user.email;

    var address = {"type":" ", "streetAddress":" ", "locality":" ", "postalCode":" ", "country":" "};

    _createEntity(id, name, nickName, userName, email, address, password, function(newEntity){
        debug(newEntity);
        debug("addEntity request to keyrock");
        _addEntity(newEntity, id, function (res) {
            _cb(res);
        });
    });
};


exports.updateEntity = function(id, org, department, streetAddress, locality, postalCode, country, cb){

    _updateEntity(id, org, department, streetAddress, locality, postalCode, country, function (res){
        cb(res);
    });
}




exports.removeEntityById = function(id, _cb) {
    debug("removing entity with id from keyrock"+id);
    _removeEntityByID(id, function(res){
        _cb(res)
    });
};



//function _authenticateByName(userName, pwd, cb){
exports.authenticateByName = function(userName, pwd, cb){
    debug("##### USER AUTHENTICATION BY NAME AND PASSWORD. Return the TOKEN #####");

    idm.getEntityByName(userName, function(err, user){
        if(!user){
            cb("Username \""+userName+"\" does not exists.", null);
        }else {
            idm.authenticateByName(userName, pwd, function(err_auth, item_token){
                if (!item_token) {
                    debug("idm.autenticateById ERROR IS: "+err_auth);
                    cb("User found but password is wrong. Please correct it and try again.", null);
                }else {
                    item_token.getToken_id(function(err_token, token_string){
                        debug("\n\n******** TOKEN CREATED: "+token_string.toString()+" ********\n\n");
                        cb(null, token_string.toString());
                    });
                }
            });

        }
    });

}


exports.getEntityByUserName = function(username, _cb) {
    debug("##### GET ENTITY BY NAME (e.g. User) #####");
    idm.getEntityByName(username, function(err, item){
        if(err){
            debug("non presente come username");
            _cb("ERROR user not exists " + err, null);
        } else if (item){
            debug("presente come username");

            debug("username: "+ item.getUserNameSync().getValueSync())

            _cb(null, item);
        }
    });
};

exports.setEntityPassword = function(username, new_password, _cb){
    debug("##### SET ENTITY PASSWORD #####");
    idm.getEntityByName(username, function(err, entity){
        if(err){
            debug("non presente come username");
            _cb("ERROR user not exists " + err, null);
        } else if (entity){
            debug("Entity presente. Aggiorno la password");
            debug("username: "+ entity.getUserNameSync().getValueSync())

            var stringPassword = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Password", new_password);
            var password = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute", "password", stringPassword);
            entity.setAttribute(password);
            idm.updateEntity(entity);

            _cb(null, "Password updated!" + entity.toString());
        }
    });

};

function _setOrganization(id, new_organization, _cb){
    debug("##### SET ENTITY organization #####");

    idm.getEntityById(id, function(err, entity){
        if(err){
            debug("non presente come username");
            _cb("ERROR user not exists " + err, null);
        } else if (entity){
            debug("username: "+ entity.getUserNameSync().getValueSync())
            entity.removeAttribute(entity.getAttributeSync("organization"));
            var att_organization = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Organization", new_organization);
            var organization = java.newInstanceSync(BASE_PACKAGE_IDM+".entities.attributes.Attribute","organization", att_organization);
            entity.setAttribute(organization);
            idm.updateEntity(entity);

            _cb("Organization updated!" + entity.toString());
        }
    });

};




/////////////////////// ************************************ TEST PART ************************************ //////////////////////




// var id = null;
// var name = "Alberto ";
// var userName = "testalbes";
// var nickName = "testalbes";
// var password = "123456";
// var email = "alserra@crs4.it";
// var address = {"type":"", "streetAddress":"", "locality":"", "postalCode":"", "country":""};
//
// _createEntity(id, name, nickName, userName, email, address, password, function(entityCreated){
//    console.log(entityCreated.getIdSync().getValueSync().toString());
//    var entity_id = entityCreated.getIdSync().getValueSync().toString();
//    _addEntity(entityCreated, entity_id, function (res) {
//        console.log(res);
//    });
// });


//_removeEntityByID("1dedcfdf-b071-431d-8279-62ce6a19e415", function (res) {
//  console.log(res);
//});

//Entity ent_by_id = identityManager.getEntityById(((Id)entity.getId().getValue()).getValue());
//
//if (test == undefined){
//  console.log("test is null");
//} else {
//  console.log("test is "+ test);
//}

// _authenticateByName("clientOne", "passw0rdCl1ent", function(res){
//    console.log(res);
//
// });

// console.log(_getEntityById("c4f48a19-1846-4b6c-9f17-0572f1f1975e"));

// _setOrganization("c4f48a19-1846-4b6c-9f17-0572f1f1975e", "crs4_new", function(res){
//     console.log(res);
// });

// _updateEntity("c4f48a19-1846-4b6c-9f17-0572f1f1975e", "CRS4", "crs4_department", "work", "Piscina MAnna", "Pula", "09010", "Italy", function (res){
//    console.log(res);
// });



//////////////////********************************************************************************************* /////////////////////