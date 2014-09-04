/* suppress jshint warnings for chai syntax - https://github.com/chaijs/chai/issues/41#issuecomment-14904150 */
/* jshint -W024 */
/* jshint expr:true */
define([
    "underscore", "backbone", "geppetto"
], function(_, Backbone, Geppetto) {
    var expect = chai.expect;

    describe("when binding a context to a view that supports dependency injection", function() {

        var contextDefinition;
        var contextInstance;

        beforeEach(function() {
            contextDefinition = Geppetto.Context.extend({
                wiring: {
                    singletons: {
                        "foo": Backbone.Model
                    }                    
                }
            });
        });

        it("should not include a reference ", function() {

            var MyViewDef = Backbone.View.extend({
                wiring: [
                    "foo"
                ]
            });
            var myView = new MyViewDef();

            var returnedContext = Geppetto.bindContext({
                view: myView,
                context: contextDefinition
            });

            expect(myView.context).not.to.exist;
            expect(returnedContext).not.to.exist;

            myView.close();
        });
    });    
    
    describe("Backbone.Geppetto.Resolver", function() {
        var context;
        var resolver;
        beforeEach(function() {
            context = new Geppetto.Context();
            resolver = context.resolver;
        });
        afterEach(function() {
            context.destroy();
            context = undefined;
            resolver = undefined;
        });
        describe("declaration", function() {
            it("should be defined as a property on the Geppetto object", function() {
                expect(Geppetto.Resolver).not.to.be.null;
            });
        });
        describe("when retrieving objects", function() {
            it("should poll the parent resolver if no corresponding mapping was found", function(){
                var value = {};
                var child = new Geppetto.Context({
                    parentContext : context
                });
                resolver.wireValue('value', value);
                var actual = child.resolver.getObject('value');
                expect(actual).to.equal(value);
            });
            it("should throw an error if no corresponding mapping was found", function() {
                expect(function() {
                    resolver.getObject('unregistered key');
                }).to.
                throw (/no mapping found/);
            });
        });
        describe("when resolving dependencies", function() {
            var key1 = 'key1';
            var value1 = {};
            var key2 = 'key2';
            var value2 = {};
            beforeEach(function() {
                resolver.wireValue(key1, value1);
                resolver.wireValue(key2, value2);
            });
            it("should accept an array for wiring config", function() {
                var depender = {
                    wiring: [key1, key2]
                };
                resolver.resolve(depender);
                expect(depender.key1).to.equal(value1);
                expect(depender.key2).to.equal(value2);
            });
            it("should accept a map for wiring config", function() {
                var depender = {
                    wiring: {
                        k1: key1,
                        k2: key2
                    }
                };
                resolver.resolve(depender);
                expect(depender.k1).to.equal(value1);
                expect(depender.k2).to.equal(value2);
            });
        });
        describe("when mapping a singleton", function() {
            var key = 'a singleton';
            var SingletonClass = function() {};
            SingletonClass.prototype.wiring = ['foo'];
            var foo = {};
            beforeEach(function() {
                resolver.wireValue('foo', foo);
                resolver.wireSingleton(key, SingletonClass);
            });
            it('should be determinable', function() {
                expect(resolver.hasWiring(key)).to.be.true;
            });
            it('should produce an instance of the mapped class', function() {
                var actual = resolver.getObject(key);
                expect(actual).to.be.an.instanceOf(SingletonClass);
            });
            it('should produce a single, unique instance', function() {
                var first = resolver.getObject(key);
                var second = resolver.getObject(key);
                expect(second).to.equal(first);
            });
            it("should be instantiatable by brute force", function() {
                var first = resolver.getObject(key);
                var second = resolver.instantiate(key);
                expect(second).to.not.equal(first);
            });
            it("should be injected with its dependencies when instantiated", function() {
                var actual = resolver.getObject(key);
                expect(actual.foo).to.equal(foo);
            });
            it("should optionally allow wiring configuration", function() {
                var dependerClass = function() {};
                resolver.wireSingleton('depender', dependerClass, {
                    dependency: key
                });
                var depender = resolver.getObject('depender');
                expect(depender.dependency).to.equal(resolver.getObject(key));
            });
        });
        describe("when mapping a value", function() {
            var key = 'a value';
            var value = {};
            beforeEach(function() {
                resolver.wireValue(key, value);
            });
            it('should be determinable', function() {
                expect(resolver.hasWiring(key)).to.be.true;
            });
            it("should be retrievable", function() {
                expect(resolver.getObject(key)).to.equal(value);
            });
            it("it should always return the same value", function() {
                var first = resolver.getObject(key);
                var second = resolver.getObject(key);
                expect(second).to.equal(first);
            });
        });
        describe("when mapping a class", function() {
            var key = 'a class';
            var clazz = function() {};
            clazz.prototype.wiring = ['foo'];
            var foo = {};
            beforeEach(function() {
                resolver.wireValue('foo', foo);
                resolver.wireClass(key, clazz);
            });
            it('should be determinable', function() {
                expect(resolver.hasWiring(key)).to.be.true;
            });
            it('should produce an instance of the mapped class', function() {
                var actual = resolver.getObject(key);
                expect(actual).to.be.an.instanceOf(clazz);
            });
            it('should produce a new instance every time', function() {
                var first = resolver.getObject(key);
                var second = resolver.getObject(key);
                expect(second).to.not.equal(first);
            });
            it("should be injected with its dependencies when instantiated", function() {
                var actual = resolver.getObject(key);
                expect(actual.foo).to.equal(foo);
            });
            it("should optionally allow wiring configuration", function() {
                var dependerClass = function() {};
                resolver.wireClass('depender', dependerClass, {
                    dependency: key
                });
                var depender = resolver.getObject('depender');
                expect(depender.dependency).to.be.an.instanceOf(clazz);
            });
        });
        describe("when mapping a view", function() {
            var key = 'a class';
            var clazz;
            beforeEach(function() {
                clazz = Backbone.View.extend();

                resolver.wireView(key, clazz);
            });
            it('should be determinable', function() {
                expect(resolver.hasWiring(key)).to.be.true;
            });
            it('should extend the view constructor', function() {
                var actual = resolver.getObject(key);
                expect(actual).to.be.a("function");
            });
            it('should retrieve the same class every time', function() {
                var first = resolver.getObject(key);
                var second = resolver.getObject(key);
                expect(second).to.equal(first);
            });
            it("should call the view's original 'initialize' function when instantiated", function() {
                var initializeSpy = sinon.spy();
                expect(initializeSpy).not.to.have.been.called;
                clazz.prototype.initialize = function() {
                    initializeSpy();
                };
                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(initializeSpy).to.have.been.calledOnce;
            });
            it("should be injected with its dependencies when instantiated", function() {
                clazz.prototype.wiring = ['foo'];
                var foo = {};
                resolver.wireValue('foo', foo);
                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(viewInstance.foo).to.equal(foo);
            });
            it("should be injected with the context's 'listen' method when instantiated", function() {
                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(viewInstance.listen).to.be.a("function");
            });
            it("should be injected with the context's 'dispatch' method when instantiated", function() {
                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(viewInstance.dispatch).to.be.a("function");
            });
            it("should call injected 'listen' only on its own context", function() {
                var otherContext = new Geppetto.Context();
                var myContextStub = sinon.stub(context, "listen");
                var otherContextStub = sinon.stub(otherContext, "listen");

                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(myContextStub).not.to.have.been.called;
                expect(otherContextStub).not.to.have.been.called;

                viewInstance.listen(viewInstance, "abc", function() {});

                expect(myContextStub).to.have.been.calledOnce;
                expect(otherContextStub).not.to.have.been.called;

                otherContext.destroy();
            });
            it("should call injected 'dispatch' only on its own context", function() {
                var otherContext = new Geppetto.Context();
                var myContextStub = sinon.stub(context, "dispatch");
                var otherContextStub = sinon.stub(otherContext, "dispatch");

                var ViewConstructor = resolver.getObject(key);
                var viewInstance = new ViewConstructor();
                expect(myContextStub).not.to.have.been.called;
                expect(otherContextStub).not.to.have.been.called;

                viewInstance.dispatch("abc");

                expect(myContextStub).to.have.been.calledOnce;
                expect(otherContextStub).not.to.have.been.called;

                otherContext.destroy();
            });
            it("should optionally allow wiring configuration", function() {
                var value = {};
                resolver.wireValue('value', value);
                resolver.release(key);
                resolver.wireView(key, clazz, {
                    dependency: 'value'
                });
                var ViewCtor = resolver.getObject(key);
                var view = new ViewCtor();
                expect(view.dependency).to.equal(value);
            });
            it("should optionally allow wiring configuration via the mappings", function() {
                var value = {};
                resolver.wireValue('value', value);
                resolver.release(key);
                resolver.wireView(key, clazz, {
                    dependency: 'value'
                });
                var ViewCtor = resolver.getObject(key);
                var view = new ViewCtor();
                expect(view.dependency).to.equal(value);
            });            
        });
        describe("when wrapping a constructor", function() {
            it("should allow wrapped constructor to handle initialization parameters in similar fashion as unwrapped constructor)", function() {
                var obj1 = {value: 'foo'};
                var obj2 = {value: 'bar'};
                var clazz = Backbone.Model.extend({
                    initialize: function (obj1, obj2) {
                        this.obj1 = obj1;
                        this.obj2 = obj2;
                    }
                });
                var originalModel = new clazz(obj1, obj2);
                var wrappedClazz = resolver._wrapConstructor(clazz, null);
                var wrappedModel = new wrappedClazz(obj1, obj2);
                expect(originalModel.obj1).to.eql(wrappedModel.obj1);
                expect(originalModel.obj2).to.eql(wrappedModel.obj2)
            });

        });
        describe("when injecting objects", function() {
            var key = 'a value';
            var value = {};
            it("should have its dependencies fulfilled", function() {
                value.wiring = ['foo'];
                var foo = {};
                resolver.wireValue('foo', foo);
                resolver.resolve(value);
                expect(value.foo).to.equal(foo);
            });
        });
        describe("when unmapping objects", function() {
            var key = 'a value';
            var value = {};
            beforeEach(function() {
                resolver.wireValue(key, value);
                resolver.release(key);
            });
            it('should be determinable', function() {
                expect(resolver.hasWiring(key)).to.be.false;
            });
            it("should not be retrievable", function() {
                expect(function() {
                    resolver.getObject(key);
                }).to.
                throw (/no mapping found/);
            });
        });
        describe('when used with Backbone objects', function(){
            var clazzInstantiated;
            var clazz = function(){
                clazzInstantiated++;
            };
            var resolvedDependency;
            var singleton = Backbone.Model.extend({
                wiring : ['clazz'],
                initialize : function(){
                    resolvedDependency = this.clazz;
                }
            });
            beforeEach(function(){
                clazzInstantiated=0;
                resolver.wireClass('clazz', clazz);
                resolver.wireSingleton('singleton', singleton);
            });
            it("should not resolve singleton dependencies twice, see #51", function(){
                var actual = resolver.getObject('singleton');
                expect(clazzInstantiated ).to.equal(1);
            });
            it("should resolve dependencies before initialization", function(){
                var actual = resolver.getObject('singleton');
                expect(resolvedDependency ).to.be.instanceOf(clazz);
            });
        });
        describe('when configuring wirings', function(){
            var key = "key";
            var passed;
            var ctor = function(){
                passed = _.toArray(arguments);
            };
            beforeEach(function(){
                passed = null;
                resolver.wireClass(key, ctor);
            });
            it("should throw an error if no corresponding mapping was found", function() {
                expect(function() {
                    resolver.configure('unregistered key');
                }).to.
                throw (/no mapping found/);
            });
            it("should throw an error for wired values", function() {
                resolver.wireValue('value', {});
                expect(function() {
                    resolver.configure('value');
                }).to.
                throw (/only possible for wirings of type singleton or class/);
            });
            it("should throw an error for wired views", function() {
                resolver.wireView('view', function(){});
                expect(function() {
                    resolver.configure('view');
                }).to.
                throw (/only possible for wirings of type singleton or class/);
            });
            it('should pass an object as payload to the constructor function', function(){
                var payload = {};
                resolver.configure(key, payload);
                resolver.getObject(key);
                expect(passed[0]).to.equal(payload);
            });
            it('should call a function and pass its results as payload to the constructor function', function(){
                var payload = {};
                resolver.configure(key, function(){
                    return payload;
                });
                resolver.getObject(key);
                expect(passed[0]).to.equal(payload);
            });
            it('should pass all arguments as payload to the constructor function', function(){
                var a = {};
                var b = {};
                resolver.configure(key, a, b);
                resolver.getObject(key);
                expect(passed[0]).to.equal(a);
                expect(passed[1]).to.equal(b);
            });
        });
    });

});
