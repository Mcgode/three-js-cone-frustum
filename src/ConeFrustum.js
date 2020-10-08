/**
 * @author Max Godefroy <max@godefroy.net>
 */

import { Vector3, Box3 } from "three-full";


export class ConeFrustum
{
    /**
     * @param base      {?Vector3}
     * @param axis      {?Vector3}
     * @param height    {?number}
     * @param radius0   {?number}
     * @param radius1   {?number}
     */
    constructor( base, axis, height, radius0, radius1 )
    {
        this.base = base || new Vector3();

        this.axis = axis || new Vector3( 0, 1, 0 );
        this.axis.normalize();

        this.height = height || 1;
        this.radius0 = radius0 || 0;
        this.radius1 = radius1 || 0;
    }


    /**
     * @param center0   {!Vector3}
     * @param radius0   {number}
     * @param center1   {!Vector3}
     * @param radius1   {number}
     * @returns {ConeFrustum}
     */
    static fromCapsule( center0, radius0, center1, radius1 )
    {
        let axis = new Vector3();
        axis.subVectors( center1, center0 )
        return new ConeFrustum( center0, axis.clone().normalize(), axis.length(), radius0, radius1 )
    }


    /**
     * @param frustum   {!ConeFrustum}
     */
    copy( frustum )
    {
        this.base = frustum.base.clone();
        this.axis = frustum.axis.clone();
        this.height = frustum.height;
        this.radius0 = frustum.radius0;
        this.radius1 = frustum.radius1;
    }


    clone()
    {
        return new ConeFrustum().copy( this );
    }


    empty()
    {
        return this.height === 0 || ( this.radius0 === 0 && this.radius1 === 0 );
    }


    /**
     * @param target    {?Box3}
     */
    getBoundingBox( target )
    {
        let c = this.base.clone();
        let d = new Vector3();

        d.set(
            Math.sqrt( 1.0 * this.axis.x * this.axis.x ),
            Math.sqrt( 1.0 * this.axis.y * this.axis.y ),
            Math.sqrt( 1.0 * this.axis.z * this.axis.z ),
        );
        d.multiplyScalar( this.radius0 );

        let box1 = new Box3( new Vector3().subVectors(c, d), new Vector3().addVectors(c, d) );

        d.divideScalar(this.radius0);
        d.multiplyScalar(this.radius1);

        c.addScaledVector(this.axis, this.height)
        let box2 = new Box3( new Vector3().subVectors(c, d), new Vector3().addVectors(c, d) );

        box1.union(box2);

        if (target != null)
            target.copy(box1)

        return box1;
    }


    /**
     * @param frustum   {!ConeFrustum}
     * @returns {boolean}
     */
    equals( frustum )
    {
        return this.base.equals(frustum.base) &&
            this.axis.equals(frustum.axis) &&
            this.height === frustum.height &&
            this.radius0 === frustum.radius0 &&
            this.radius1 === frustum.radius1
    }
}


const THREE = require('three-full');
THREE.ConeFrustum = ConeFrustum;


THREE.Ray.prototype.intersectsConeFrustum = function ()
{
   let D = new Vector3();
   let target2 = new Vector3();
   let u = new Vector3();

   return function ( frustum, target )
   {
       if (target == null)
           target = target2;

       let deltaR = frustum.radius1 - frustum.radius0;
       let r = 1 + Math.pow(deltaR / frustum.height, 2);
       let R = frustum.radius0 * deltaR / frustum.height;

       D.subVectors(this.origin, frustum.base);
       let DdA = D.dot(frustum.axis);
       let DdD = D.dot(D);
       let VdA = this.direction.dot(frustum.axis)
       let VdD = this.direction.dot(D);
       let VdV = this.direction.dot(this.direction);

       let c0 = frustum.radius0 * frustum.radius0 + 2 * R * DdA + r * DdA * DdA - DdD;
       let c1 = R * VdA + r * DdA * VdA - VdD;
       let c2 = r * VdA * VdA - VdV;

       if (c2 !== 0) {
           let discr = c1 * c1 - c2 * c0;

           if (discr < 0)
               return null;

           else if (discr === 0) {
               let t = -c1 / c2;
               u.copy(D)
               u.addScaledVector(this.direction, t);
               let d = frustum.axis.dot(u);

               if (t >= 0 && d >= 0 && d <= frustum.height) {
                   target2.addVectors(frustum.base, u);
                   target.copy(target2);
                   return target2
               }
           }

           else {
               let quantity = 0;
               let root = Math.sqrt(discr);

               let t0 = (-c1 - root) / c2;
               u.copy(D)
               u.addScaledVector(this.direction, t0);
               let d = frustum.axis.dot(u);

               if (t0 >= 0 && d >= 0 && d <= frustum.height) {
                   target2.addVectors(frustum.base, u);
                   quantity ++;
               }

               let t1 = (-c1 + root) / c2;
               u.copy(D)
               u.addScaledVector(this.direction, t1);
               d = frustum.axis.dot(u);

               if (t1 >= 0 && (quantity === 0 || t0 > t1) && d >= 0 && d <= frustum.height) {
                   target2.addVectors(frustum.base, u);
                   quantity ++;
               }

               if (quantity) target.copy(target2);
               return quantity ? target2 : null
           }
       }

       else if (c1 !== 0) {
           let t = -2 * c0 / c1;
           u.copy(D)
           u.addScaledVector(this.direction, t);
           let d = frustum.axis.dot(u);

           if (t >= 0 && d >= 0 && d <= frustum.height) {
               target2.addVectors(frustum.base, u);
               target.copy(target2)
               return target
           }
       }

       return null
   }
}()
