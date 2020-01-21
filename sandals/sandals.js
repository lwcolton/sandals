var swaggerSpec = {};
var headerContainer = $( "#headerContainer" );
var bodyContainer = $( "#bodyContainer" );
var queryParams = {};
var templates = {};
var headerComponentName = "menu";
var errorPageName = "error";
var pageState = {};
var frameworkSettings = {}
var prepareDocument;
var preparePage;

$( window ).on( 'popstate', function( e ) {
     _loadWindow()
} );

$( document ).ready(function() {
    compileTemplates(pages);
    compileTemplates(components);
    $.each(components, function(componentName, component){
        component.name = componentName;
    });
    registerComponentHelpers();
    Handlebars.registerHelper("equals", function(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }

      return options.inverse(this);
    });
    Handlebars.registerHelper("call", function(funcName, param) { return eval(funcName)(param);});

    if(frameworkSettings.prepareDocument != undefined){
        prepareDocument = frameworkSettings.prepareDocument;
    } else {
        prepareDocument = function(){
            return new Promise(function(resolve, reject){
                resolve()
            })
        }
    }
    prepareDocument().then(function(){
        _loadWindow()
    })

});


function _loadWindow(){
    if(!location.hash && frameworkSettings.homepageHash != undefined){
        location.hash = frameworkSettings.homepageHash;
    }
    var pageName = location.hash.substr(1);
    pageState.queryParams = getJsonFromUrl(location.search);
    showPage(pageName, {pushHistory: false});
}

function showPage(pageName, options){
    if(options == undefined){
        options = {};
    }
    var pushHistory = options.pushHistory;
    var componentState = options.componentState;
    var setQueryParams = options.setQueryParams;
    pageState.pageName = pageName;
    if(pushHistory == undefined) {
        pushHistory = true;
    }
    var pageUrl = "";
    if(setQueryParams == undefined){
        setQueryParams = {};
    }
    pageState.queryParams = setQueryParams;
    pageUrl += "?";
    var params = $.param(setQueryParams);
    if(params) {
        pageUrl += params;
    }
    pageUrl += "#" + pageName;
    if(pushHistory){
        window.history.pushState(setQueryParams, pageName, pageUrl);
    }

    if(frameworkSettings.preparePage != undefined){
        var preparePage = frameworkSettings.preparePage;
    } else {
        var preparePage = function(){
            return new Promise(function(resolve, reject){
                resolve();
            })
        }
    }
    preparePage().then(function(){
        window.scrollTo(0,0);
        if(headerComponentName){
            showComponent(headerComponentName, headerContainer);
        }
        _showPage(pageName, componentState)
    }).catch(function(error){
        console.log(error)
    })
}

function _showPage(pageName, componentState) {
    var page = pages[pageName];
    if(page == undefined){
        bodyContainer.empty();
        bodyContainer.text("Page not found");
    } else {
        showComponent(page, bodyContainer, componentState);
    }
}

function generateId(){
    return new Date().getTime().toString().replace(".", "-") + "-" + Math.random().toString().replace(".", "-");
}

function showComponent(component, container, componentState) {
    container.empty();
    renderComponent("componentLoading", {}).then(function(loadingComponent){
        container.append(loadingComponent)
    });
    component.reload = function(componentState){
        showComponent(component, container, componentState)
    };

    renderComponent(component, componentState).then(function(element){
        container.empty();
        container.append(element);
    });
}


function renderComponent(component, componentState) {
    var component;
    if(typeof component == "string") {
        component = components[component];
    }

    if(!componentState){
        componentState = {};
    }
    var index = component["index.js"];
    var elementId = component.name + "-" + generateId();
    componentState.elementId = elementId;
    return new Promise(function(resolve, reject){
        index.onShow(index, component, componentState).then(function(element){
            element = $(element);
            element.attr("id", elementId);
            resolve(element);
        });
    });

}

function compileTemplates(components) {
    $.each(components, function(componentName, component) {
        $.each(component, function(componentKey, componentValue) {
            if(componentKey.endsWith(".html")) {
                component[componentKey] = Handlebars.compile(componentValue);
            }
        });
    });
}

function registerComponentHelpers() {
    $.each(components, function(componentName, component){
        Handlebars.registerHelper(componentName, function(state) {
            return new Handlebars.SafeString(
                renderComponent(componentName, state).html()
            );
        });
    });
}

function getJsonFromUrl(url) {
  if(!url) url = location.href;
  var question = url.indexOf("?");
  var hash = url.indexOf("#");
  if(hash==-1 && question==-1) return {};
  if(hash==-1) hash = url.length;
  var query = question==-1 || hash==question+1 ? url.substring(hash) :
  url.substring(question+1,hash);
  var result = {};
  query.split("&").forEach(function(part) {
    if(!part) return;
    part = part.split("+").join(" "); // replace every + with space, regexp-free version
    var eq = part.indexOf("=");
    var key = eq>-1 ? part.substr(0,eq) : part;
    var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
    var from = key.indexOf("[");
    if(from==-1) result[decodeURIComponent(key)] = val;
    else {
      var to = key.indexOf("]",from);
      var index = decodeURIComponent(key.substring(from+1,to));
      key = decodeURIComponent(key.substring(0,from));
      if(!result[key]) result[key] = [];
      if(!index) result[key].push(val);
      else result[key][index] = val;
    }
  });

  return result;
}

function recursiveGet(keys, object){
    var value = object[keys[0]];
    if(value == undefined){
        return undefined;
    }
    keys = keys.slice(1);
    if(keys.length == 0){
        return value;
    }
    return recursiveGet(keys, value);
}
