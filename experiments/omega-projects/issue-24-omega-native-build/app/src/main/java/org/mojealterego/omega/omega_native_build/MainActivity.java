package org.mojealterego.omega.omega_native_build;
import android.app.Activity;import android.os.Bundle;import android.view.View;import android.view.MotionEvent;import android.graphics.Canvas;import android.graphics.Paint;import android.graphics.Color;
public class MainActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);setContentView(new GameView());}
 class GameView extends View {Paint paint=new Paint(3);float x=150,y=150,r=26,velocity=0;long last=0;int score=0;GameView(){super(MainActivity.this);setFocusable(true);} 
 @Override public void onDraw(Canvas canvas){super.onDraw(canvas);long now=System.nanoTime();float dt=last==0?0:Math.min(.05f,(now-last)/1000000000f);last=now;float floor=getHeight()*.82f;velocity+=820*dt;y=Math.min(floor, y+velocity*dt);if(y==floor)velocity=0;canvas.drawColor(Color.rgb(8,11,24));paint.setColor(Color.rgb(56,189,248));canvas.drawCircle(x,y,r,paint);paint.setColor(Color.WHITE);paint.setTextSize(36);canvas.drawText("OMEGA Canvas Physics Engine",28,60,paint);paint.setTextSize(24);canvas.drawText("Tap to jump | Jumps: "+score,28,105,paint);postInvalidateDelayed(16);}
 @Override public boolean onTouchEvent(MotionEvent event){if(event.getAction()==MotionEvent.ACTION_DOWN){velocity=-490;score++;invalidate();return true;}return true;}}
}
