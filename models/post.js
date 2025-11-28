'use strict';
const { Model } = require( 'sequelize' );
const moment = require( 'moment' );
module.exports = ( sequelize, DataTypes ) =>
{
  class Post extends Model
  {
    static associate ( models )
    {
      Post.belongsTo( models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' } );
      Post.hasMany( models.Photo, { foreignKey: 'post_id', onDelete: 'CASCADE' } );
      Post.hasMany( models.Wishlist, { foreignKey: 'post_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' } );
      Post.hasMany( models.Like, { foreignKey: 'post_id', onDelete: 'CASCADE' } );
    }
  }
  Post.init( {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    country: DataTypes.STRING,
    city: DataTypes.STRING,
    continent: DataTypes.STRING,
    longitude: DataTypes.STRING,
    latitude: DataTypes.STRING,
    visit_date: DataTypes.DATE,
    reason_for_visit: DataTypes.TEXT,
    overall_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 }
    },
    experience: DataTypes.TEXT,
    cost_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 }
    },
    safety_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 }
    },
    food_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 }
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
   // Keep these as BIGINT
    createdAt: {
      type: DataTypes.BIGINT,
      // Add a getter to convert BIGINT to a readable date
      get ()
      {
        const timestamp = this.getDataValue( 'createdAt' );
        return timestamp ? moment( Number( timestamp ) ) : null;
      }
    },
    updatedAt: {
      type: DataTypes.BIGINT,
      // Add a getter to convert BIGINT to a readable date
      get ()
      {
        const timestamp = this.getDataValue( 'updatedAt' );
        return timestamp ? moment( Number( timestamp ) ) : null;
      }
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true
    },
    place_type: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Post',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeCreate: ( post, options ) =>
      {
        const now = Date.now();
        post.createdAt = now;
        post.updatedAt = now;
      },
      beforeUpdate: ( post, options ) =>
      {
        post.updatedAt = Date.now();
      }
    }
  } );
  return Post;
};
