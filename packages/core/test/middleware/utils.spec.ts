import { RequestMethod, Type } from '@nestjs/common';
import { expect } from 'chai';
import * as pathToRegexp from 'path-to-regexp';
import * as sinon from 'sinon';
import {
  assignToken,
  filterMiddleware,
  isMiddlewareClass,
  isRouteExcluded,
  mapToClass,
} from '../../middleware/utils';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('middleware utils', () => {
  const noopAdapter = new NoopHttpAdapter({});

  class Test {}
  function fnMiddleware(req, res, next) {}

  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], noopAdapter)).to.have.length(2);
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      describe('when there is no excluded routes', () => {
        it('should return an identity', () => {
          const type = mapToClass(Test, [], noopAdapter);
          expect(type).to.eql(Test);
        });
      });
      describe('when there are excluded routes', () => {
        it('should return a host class', () => {
          const type = mapToClass(
            Test,
            [{ path: '*', method: RequestMethod.ALL, regex: /./ }],
            noopAdapter,
          );
          expect(type).to.not.eql(Test);
          expect(type.name).to.eql(Test.name);
        });
      });
    });
    describe('when middleware is a function', () => {
      it('should return a metatype', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(metatype).to.not.eql(fnMiddleware);
      });
      it('should define a `use` method', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter) as Type<any>;
        expect(new metatype().use).to.exist;
      });
      it('should encapsulate a function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy, [], noopAdapter) as Type<any>;
        new metatype().use();
        expect(spy.called).to.be.true;
      });
    });
  });
  describe('isMiddlewareClass', () => {
    describe('when middleware is a class', () => {
      it('should returns true', () => {
        expect(isMiddlewareClass(Test)).to.be.true;
      });
    });
    describe('when middleware is a function', () => {
      it('should returns false', () => {
        expect(isMiddlewareClass(fnMiddleware)).to.be.false;
      });
    });
  });
  describe('assignToken', () => {
    describe('should define `name` property on metatype', () => {
      const AnonymousType = class {};
      assignToken(AnonymousType);
      expect(AnonymousType.name).to.exist;
    });
    describe('should use passed token as `name`', () => {
      const AnonymousType = class {};
      const token = 'token';

      assignToken(AnonymousType, token);
      expect(AnonymousType.name).to.eq(token);
    });
  });

  describe('isRouteExcluded', () => {
    let adapter: NoopHttpAdapter;

    beforeEach(() => {
      adapter = new NoopHttpAdapter({});
      sinon.stub(adapter, 'getRequestMethod').callsFake(() => 'GET');
      sinon.stub(adapter, 'getRequestUrl').callsFake(() => '/cats/3');
    });
    describe('when route is excluded', () => {
      const path = '/cats/(.*)';
      const excludedRoutes = [
        {
          path,
          method: RequestMethod.GET,
          regex: pathToRegexp(path),
        },
      ];
      it('should return true', () => {
        expect(isRouteExcluded({}, excludedRoutes, adapter)).to.be.true;
      });
    });
    describe('when route is not excluded', () => {
      it('should return false', () => {
        expect(isRouteExcluded({}, [], adapter)).to.be.false;
      });
    });
  });
});
