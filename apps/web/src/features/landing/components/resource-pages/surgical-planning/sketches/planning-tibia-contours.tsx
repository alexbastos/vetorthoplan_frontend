import styles from "../../sketches/resource-sketch.module.css"
import { tibiaPlacement } from "./planning-tibia-geometry"

// Outer paths copied from tibia-tpa-card.svg. Keep the anatomical curves while
// omitting radiographic fills, gradients, textures and tiny trabecular details.
const contours = [
  {
    id: "femur", at: .2, duration: .14,
    d: "M574 70C541 65 513 59 481 53L447 47C435 45 427 39 421 30 415 18 407 20 395 21 374 21 350 28 336 40 321 53 314 72 308 91 303 104 301 116 306 131 310 146 319 156 332 158 345 160 357 155 363 144 369 130 379 121 394 115 420 103 452 105 477 107 511 110 544 120 574 128Z",
  },
  {
    id: "patella", at: .22, duration: .1,
    d: "M293 60C288 52 294 32 302 23 311 13 329 5 340 8 350 10 358 16 360 24 349 29 338 33 327 40 313 49 301 63 293 60Z",
  },
  {
    id: "fibula", at: .24, duration: .16,
    d: "M314 181C316 175 325 170 332 170 338 166 347 169 350 173 352 178 343 184 338 187 332 191 326 196 323 206 318 232 315 263 310 293L298 375 285 457 274 527 266 582 258 583C261 546 265 509 271 472 276 432 283 394 289 356 294 319 301 280 307 245 311 222 309 202 314 181Z",
  },
  {
    id: "tibia", at: .2, duration: .2,
    d: "M185 174C194 160 206 143 219 136 232 128 244 131 252 133 259 128 267 131 274 137 284 140 295 138 303 143 311 148 314 160 318 169 323 177 331 183 330 193 329 200 318 207 311 218 294 241 283 267 277 299 268 340 267 380 269 422 271 467 272 506 270 551L267 647 262 752C260 786 257 818 257 844 257 871 259 893 264 910 267 922 265 930 260 937 251 944 240 935 230 931 217 929 204 929 195 921 188 914 190 904 194 891 206 851 210 821 211 786L216 685C218 650 220 611 219 578 219 535 216 496 213 456 210 411 205 370 195 332 191 318 180 309 177 295 171 274 179 246 182 224 184 208 180 200 179 189 178 182 181 178 185 174Z",
  },
  {
    id: "talus", at: .28, duration: .12,
    d: "M200 920C210 912 220 908 232 910 245 912 254 921 257 933 260 948 252 961 242 970 234 978 215 982 200 980 186 978 178 968 182 957 184 949 197 946 196 939 190 933 191 927 200 920Z",
  },
] as const

type TibiaContourId = typeof contours[number]["id"]

function PlanningTibiaContours({ strokeWidth = .8, bones }: { strokeWidth?: number; bones?: readonly TibiaContourId[] }) {
  return (
    <g opacity=".28" transform={`translate(${tibiaPlacement.x} ${tibiaPlacement.y}) scale(${tibiaPlacement.scaleX} ${tibiaPlacement.scaleY})`}>
      {contours.filter(contour => !bones || bones.includes(contour.id)).map(({ id, d, at, duration }) => (
        <path key={id} className={styles.line} d={d}
          style={{ strokeWidth: strokeWidth / Math.sqrt(tibiaPlacement.scaleX * tibiaPlacement.scaleY) }}
          data-a="draw" data-t={at} data-d={duration} />
      ))}
    </g>
  )
}

export { PlanningTibiaContours }
